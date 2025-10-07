from dotenv import load_dotenv
import aiohttp
import json
import os
import asyncio

from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions
from livekit.agents.llm import function_tool
from livekit.plugins import noise_cancellation, google

from prompts import AGENT_INSTRUCTION, SESSION_INSTRUCTION

load_dotenv()


# ---------------------------------------------------------------------
# 🧠 Assistant Class
# ---------------------------------------------------------------------
class Assistant(Agent):
    def __init__(self) -> None:
        # Create the Google Realtime model
        realtime_model = google.beta.realtime.RealtimeModel(
                voice="Aoede",
            temperature=0.8
        )
        
        super().__init__(
            instructions=AGENT_INSTRUCTION
            + "\n\nIMPORTANT: Always respond in English only. Never use Urdu or Hindi.",
            llm=realtime_model,
            tts=realtime_model,  # Use the same model for TTS
            tools=[],  # Tools will be added via @function_tool decorator
        )
        self.user_id = "default-user"
        self._room = None

    # -----------------------------------------------------------------
    # 🔎 Query the user's knowledge base (RAG)
    # -----------------------------------------------------------------
    @function_tool()
    async def query_knowledge_base(self, query: str) -> str:
        """Retrieve relevant information from the user's knowledge base."""
        try:
            # Use the agent's user_id - could be email or UUID
            user_id = self.user_id
            print(f"🔍 RAG Query - Using user_id: {user_id} (type: {type(user_id)})")
            base_url = "http://localhost:8000"

            async with aiohttp.ClientSession() as session:
                form_data = aiohttp.FormData()
                form_data.add_field("query", query)
                form_data.add_field("user_id", user_id)

                async with session.post(
                    f"{base_url}/internal/respond",
                    data=form_data,
                    timeout=aiohttp.ClientTimeout(total=40),
                ) as resp:
                    if resp.status == 200:
                        result = await resp.json()
                        answer = result.get("answer_text", "No answer found.")
                        print(f"🧠 RAG response: {answer[:150]}...")
                        return answer
                    else:
                        text = await resp.text()
                        print(f"⚠️ RAG Error: {text}")
                        return "I couldn't find relevant information in your documents."
        except Exception as e:
            print(f"❌ RAG query error: {e}")
            return "I encountered an error while searching your knowledge base."


# ---------------------------------------------------------------------
# 🚀 Main Entrypoint
# ---------------------------------------------------------------------
async def entrypoint(ctx: agents.JobContext):
    print("🚀 Starting AI Host Agent...")

    # Initialize session and agent
    session = AgentSession()
    agent = Assistant()

    # Connect to LiveKit
    await ctx.connect()
    room = ctx.room
    
    print(f"🏠 Connected to room: {room.name}")
    # Fix the async issue with room.sid
    try:
        room_sid = await room.sid
        print(f"🏠 Room SID: {room_sid}")
    except:
        print(f"🏠 Room SID: Not available")
    print(f"🏠 Room metadata: {getattr(room, 'metadata', 'No metadata')}")
    
    # -----------------------------------------------------------------
    # 🧩 Set up participant event listeners FIRST
    # -----------------------------------------------------------------
    agent.user_id = "default-user"
    print(f"🔍 DEBUG: Setting up participant event listeners...")
    
    # Set up event listener for when participants join
    def on_participant_connected(participant):
        print(f"🎉 PARTICIPANT JOINED: {participant.identity}")
        print(f"🔍 DEBUG: Participant type: {type(participant)}")
        print(f"🔍 DEBUG: Participant attributes: {dir(participant)}")
        
        if participant.identity and not participant.identity.startswith("agent"):
            # Check participant metadata first
            if hasattr(participant, 'metadata') and participant.metadata:
                metadata_str = participant.metadata
                print(f"🔍 DEBUG: New participant metadata: {metadata_str}")
                try:
                    # Parse JSON metadata
                    metadata = json.loads(metadata_str)
                    if 'userId' in metadata:
                        agent.user_id = metadata['userId']
                        print(f"✅ Found user_id in new participant metadata: {agent.user_id}")
                    elif 'user_id' in metadata:
                        agent.user_id = metadata['user_id']
                        print(f"✅ Found user_id in new participant metadata: {agent.user_id}")
                except json.JSONDecodeError as e:
                    print(f"⚠️ Could not parse new participant metadata JSON: {e}")
                    print(f"🔍 Raw metadata: {metadata_str}")
            
            # Fallback: use participant identity (email)
            if agent.user_id == "default-user":
                agent.user_id = participant.identity
                print(f"✅ Using new participant identity as user_id: {agent.user_id}")
            
            # Now fetch chunks for this user
            print(f"🔄 Fetching chunks for newly joined user: {agent.user_id}")
            # We'll fetch chunks in the main flow, but this ensures we have the right user_id
    
    # Register the event listener
    room.on("participant_connected", on_participant_connected)
    
    # Also add other event listeners for debugging
    def on_participant_disconnected(participant):
        print(f"👋 PARTICIPANT LEFT: {participant.identity}")
    
    def on_room_metadata_changed(metadata):
        print(f"📝 ROOM METADATA CHANGED: {metadata}")
    
    room.on("participant_disconnected", on_participant_disconnected)
    room.on("room_metadata_changed", on_room_metadata_changed)
    
    print(f"🎧 Event listeners registered for room: {room.name}")
    
    # -----------------------------------------------------------------
    # 🧩 Check for existing participants
    # -----------------------------------------------------------------
    print(f"🔍 DEBUG: Checking for existing participants...")
    
    try:
        # Check if room has metadata with user_id
        if hasattr(room, 'metadata') and room.metadata:
            metadata_str = room.metadata
            print(f"🔍 DEBUG: Room metadata: {metadata_str}")
            try:
                # Parse JSON metadata
                metadata = json.loads(metadata_str)
                if 'userId' in metadata:
                    agent.user_id = metadata['userId']
                    print(f"✅ Found user_id in room metadata: {agent.user_id}")
                elif 'user_id' in metadata:
                    agent.user_id = metadata['user_id']
                    print(f"✅ Found user_id in room metadata: {agent.user_id}")
            except json.JSONDecodeError as e:
                print(f"⚠️ Could not parse room metadata JSON: {e}")
                print(f"🔍 Raw room metadata: {metadata_str}")
        
        # Check existing participants - use correct LiveKit API
        participants = []
        try:
            # Use the correct LiveKit room API
            participants = list(room.remote_participants.values())
            print(f"🔍 DEBUG: Found {len(participants)} remote participants")
            
            # Also check local participants
            if room.local_participant:
                participants.append(room.local_participant)
                print(f"🔍 DEBUG: Found 1 local participant")
        except Exception as e:
            print(f"⚠️ Error getting participants: {e}")
            # Fallback to old method
            if hasattr(room, "get_participants"):
                participants = room.get_participants()
            elif hasattr(room, "participants"):
                participants = room.participants.values()

        print(f"🔍 DEBUG: Total participants found: {len(participants)}")
        
        for participant in participants:
            print(f"🔍 DEBUG: Existing participant identity: {participant.identity}")
            if participant.identity and not participant.identity.startswith("agent"):
                # Check participant metadata
                if hasattr(participant, 'metadata') and participant.metadata:
                    metadata_str = participant.metadata
                    print(f"🔍 DEBUG: Existing participant metadata: {metadata_str}")
                    try:
                        # Parse JSON metadata
                        metadata = json.loads(metadata_str)
                        if 'userId' in metadata:
                            agent.user_id = metadata['userId']
                            print(f"✅ Found user_id in existing participant metadata: {agent.user_id}")
                            break
                        elif 'user_id' in metadata:
                            agent.user_id = metadata['user_id']
                            print(f"✅ Found user_id in existing participant metadata: {agent.user_id}")
                            break
                    except json.JSONDecodeError as e:
                        print(f"⚠️ Could not parse participant metadata JSON: {e}")
                        print(f"🔍 Raw metadata: {metadata_str}")
                
                # Fallback: use participant identity (email) as user_id for RAG lookup
                if agent.user_id == "default-user":
                    agent.user_id = participant.identity
                    print(f"✅ Using existing participant identity as user_id: {agent.user_id}")
                    break
        
        # If still not found, wait for participant to join
        if agent.user_id == "default-user":
            print(f"⏳ No user found yet, waiting for participant to join...")
            # Don't wait here - let the event listener handle it
    
    except Exception as e:
        print(f"⚠️ Error checking existing participants: {e}")
        # Keep default-user as fallback
    
    print(f"🔍 DEBUG: Current agent.user_id: {agent.user_id}")

    # Wait a moment for room to be fully connected
    print(f"⏳ Waiting for room to be fully connected...")
    await asyncio.sleep(2)
    
    # Check participants again after waiting - use correct LiveKit API
    participants_after_wait = []
    try:
        participants_after_wait = list(room.remote_participants.values())
        if room.local_participant:
            participants_after_wait.append(room.local_participant)
    except Exception as e:
        print(f"⚠️ Error getting participants after wait: {e}")
        # Fallback
        if hasattr(room, "get_participants"):
            participants_after_wait = room.get_participants()
        elif hasattr(room, "participants"):
            participants_after_wait = room.participants.values()
    
    print(f"🔍 DEBUG: Participants after waiting: {len(participants_after_wait)}")
    for p in participants_after_wait:
        print(f"🔍 DEBUG: Participant after wait: {p.identity}")
    
    agent._room = room

    # -----------------------------------------------------------------
    # 🗂️ Fetch actual chunks (context text) for greeting
    # -----------------------------------------------------------------
    initial_context = await fetch_initial_chunks(agent.user_id)
    if initial_context:
        init_message = (
            "Hello! I’ve loaded your knowledge base. "
            "Here’s what I found in your documents:\n" + initial_context[:400]
        )
    else:
        init_message = "Hello! I couldn’t find any uploaded documents for you yet."

    # -----------------------------------------------------------------
    # 🎧 Start Real-time Gemini Voice Session
    # -----------------------------------------------------------------
    await session.start(
        room=room,
        agent=agent,
        room_input_options=RoomInputOptions(
            video_enabled=False,
            noise_cancellation=noise_cancellation.BVC(),
        ),
    )

    print("🎤 AI Host Session Started Successfully!")
    # await session.say(init_message)
    print(f"💬 Initial Greeting Sent: {init_message}")

    # continue standard behavior
    await session.generate_reply(instructions=SESSION_INSTRUCTION)


# ---------------------------------------------------------------------
# 📦 Fetch initial chunks from internal respond
# ---------------------------------------------------------------------
async def fetch_initial_chunks(user_id: str) -> str:
    """Ask the backend to return context text directly from chunks."""
    try:
        # Use the provided user_id - could be email or UUID
        print(f"📄 Fetching initial chunks for user_id: {user_id}")
        async with aiohttp.ClientSession() as session:
            form_data = aiohttp.FormData()
            form_data.add_field("query", "Tell me about the document I uploaded")
            form_data.add_field("user_id", user_id)

            async with session.post(
                "http://localhost:8000/internal/respond",
                data=form_data,
                timeout=aiohttp.ClientTimeout(total=25),
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    context = data.get("answer_text", "")
                    print(f"📄 Initial chunks context fetched ({len(context)} chars).")
                    return context
    except Exception as e:
        print(f"⚠️ Could not fetch initial chunks: {e}")
    return ""


# ---------------------------------------------------------------------
# 🧩 CLI Run
# ---------------------------------------------------------------------
if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
