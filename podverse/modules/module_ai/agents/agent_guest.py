"""
AI Guest Agent - Basic implementation for AI Guest role
"""
from dotenv import load_dotenv
import asyncio
import traceback
import json
from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions
from livekit.agents.llm import function_tool
from livekit.plugins import noise_cancellation, google

try:
    from prompts.prompts_guest import AGENT_INSTRUCTION, SESSION_INSTRUCTION
    from agents.base_agent import (
        query_knowledge_base,
        extract_topic_from_context,
        trigger_audio_egress,
        stop_audio_egress,
        restart_egress_with_delay
    )
except ImportError:
    # Fallback for when running directly
    import sys
    import os
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from prompts.prompts_guest import AGENT_INSTRUCTION, SESSION_INSTRUCTION
    from agents.base_agent import (
        query_knowledge_base,
        extract_topic_from_context,
        trigger_audio_egress,
        stop_audio_egress,
        restart_egress_with_delay
    )

load_dotenv()

# ---------- Guest Agent class ----------
class GuestAgent(Agent):
    def __init__(self, persona=None, voice_name=None) -> None:
        # Use provided voice_name or default to "Charon"
        selected_voice = voice_name if voice_name else "Charon"
        llm_model = google.beta.realtime.RealtimeModel(
            model="models/gemini-2.0-flash-exp",
            temperature=0.8,
            voice=selected_voice,  # Use selected voice or default
        )
        print(f"🎤 Guest Agent initialized with voice: {selected_voice}")
        
        api_google = os.environ.get('GOOGLE_API_KEY')
        
        print(f"The value of API_KEY is: {api_google}")

        # Create dynamic instructions based on persona
        dynamic_instructions = AGENT_INSTRUCTION
        if persona:
            persona_info = f"""
**YOUR PERSONA:**
- Name: {persona.get('name', 'Unknown')}
- Role: {persona.get('role', 'Unknown')}
- Background: {persona.get('background', 'Unknown')}
- Tone: {persona.get('tone', 'friendly')}
- Expertise: {', '.join(persona.get('expertise', []))}

**CRITICAL PERSONA RULES:**
- You must embody this persona completely
- Respond as {persona.get('name', 'this person')} would, using their tone, background, and expertise
- **NEVER make up stories, anecdotes, or experiences about {persona.get('name', 'this person')}**
- **ALWAYS query the knowledge base before sharing any specific information about {persona.get('name', 'this person')}**
- **If asked for stories or experiences, query your knowledge base first**
- **If the knowledge base doesn't have the information, respond naturally: "I don't recall that" or "That's not something I remember"**
- **NEVER say "my records" or "let me consult" - sound like a natural human guest**
"""
            dynamic_instructions += persona_info
            print(f"🎭 Initializing Guest Agent with persona: {persona.get('name', 'Unknown')}")

        super().__init__(
            instructions=dynamic_instructions + "\n\nIMPORTANT: Always respond in English only. NEVER make up fictional content. SOUND LIKE A NATURAL HUMAN GUEST, NOT A ROBOT ASSISTANT.",
            llm=llm_model,
            tools=[],
        )

        self.user_id = "default-user"
        self.selected_kb_id = None  
        self._room = None
        self._paused = False
        self.persona = persona  # Store guest persona
        self._updated_instructions = None  # Will be set when persona is updated

    def update_persona(self, persona_data):
        """Update the agent's persona and instructions"""
        self.persona = persona_data
        if persona_data:
            persona_info = f"""
**YOUR PERSONA:**
- Name: {persona_data.get('name', 'Unknown')}
- Role: {persona_data.get('role', 'Unknown')}
- Background: {persona_data.get('background', 'Unknown')}
- Tone: {persona_data.get('tone', 'friendly')}
- Expertise: {', '.join(persona_data.get('expertise', []))}

**IMPORTANT: You must embody this persona completely. Respond as {persona_data.get('name', 'this person')} would, using their tone, background, and expertise.**
"""
            # Store the updated instructions for use in responses
            self._updated_instructions = AGENT_INSTRUCTION + persona_info + "\n\nIMPORTANT: Always respond in English only."
            print(f"🎭 Updated guest agent with persona: {persona_data.get('name', 'Unknown')}")
            print(f"🎭 Persona details: {persona_data.get('role', 'Unknown')} - {persona_data.get('background', 'Unknown')[:100]}...")
            
            # Override the agent's response behavior
            self._persona_override = True

    @function_tool()
    async def query_knowledge_base(self, query: str) -> str:
        """Call backend /internal/respond to get context chunks for user."""
        return await query_knowledge_base(query, self.user_id, self.selected_kb_id)

    def get_effective_instructions(self):
        """Get the effective instructions including persona if available"""
        if hasattr(self, '_updated_instructions') and self._updated_instructions:
            return self._updated_instructions
        return self.instructions

    async def generate_reply_with_persona(self, session, text=None, instructions=None):
        """Generate reply with persona context"""
        if hasattr(self, '_updated_instructions') and self._updated_instructions:
            # Use persona-specific instructions
            effective_instructions = self._updated_instructions
            if instructions:
                effective_instructions = f"{self._updated_instructions}\n\n{instructions}"
            
            if text:
                return await session.generate_reply(text=text, instructions=effective_instructions)
            else:
                return await session.generate_reply(instructions=effective_instructions)
        else:
            # Use default behavior
            if text:
                return await session.generate_reply(text=text, instructions=instructions)
            else:
                return await session.generate_reply(instructions=instructions)


# ---------- Entrypoint ----------
async def entrypoint_guest(ctx: agents.JobContext):
    print("🚀 Starting AI Guest Agent...")

    session = AgentSession()
    agent = GuestAgent()  # Will be updated with persona later
    global_agent = agent  # Store reference for updates
    session_started = False

    # connect to LiveKit
    await ctx.connect()
    room = ctx.room
    agent._room = room

    async def start_agent_session():
        """Start the agent session with the current agent"""
        nonlocal session_started
        try:
            await session.start(
                room=room,
                agent=agent,
                room_input_options=RoomInputOptions(
                    video_enabled=False,
                    noise_cancellation=noise_cancellation.BVC(),
                ),
            )
            session_started = True
            print("🎤 AI Guest Session Started Successfully!")
            print("📝 Transcript will be automatically generated by egress")
            return True
        except Exception as e:
            print(f"❌ Failed to start agent session: {e}")
            traceback.print_exc()
            return False

    print(f"🏠 Connected to room: {getattr(room, 'name', 'unknown')}")
    await asyncio.sleep(0.6)

    # Don't start egress immediately - wait for participant metadata
    room_name_str = getattr(room, 'name', 'my-room')
    print(f"🎬 Will start recording after participant connects with metadata...")

    # safe on helper
    def safe_on(event_name, handler):
        try:
            room.on(event_name, handler)
            print(f"🔔 Registered event: {event_name}")
        except Exception as e:
            print(f"⚠️ Could not register {event_name}: {e}")

    # -------------- participant handlers --------------
    def on_participant_connected(participant):
        try:
            ident = getattr(participant, "identity", None)
            print(f"🎉 participantConnected: {ident}")
            if ident and not str(ident).startswith("agent"):
                meta = getattr(participant, "metadata", None)
                if meta:
                    try:
                        parsed = json.loads(meta)
                        if "userId" in parsed:
                            agent.user_id = parsed["userId"]
                        elif "user_id" in parsed:
                            agent.user_id = parsed["user_id"]
                        if "selectedKbId" in parsed:
                            agent.selected_kb_id = parsed["selectedKbId"]
                        voice_name = parsed.get("voice_name")
                        if "guest_persona" in parsed:
                            # Create new agent with persona and voice
                            new_agent = GuestAgent(persona=parsed["guest_persona"], voice_name=voice_name)
                            new_agent.user_id = agent.user_id
                            new_agent.selected_kb_id = agent.selected_kb_id
                            new_agent._room = agent._room
                            agent = new_agent
                            global_agent = agent
                            print(f"🔄 Created new agent with persona: {parsed['guest_persona'].get('name', 'Unknown')}")
                            if voice_name:
                                print(f"🎤 Using voice: {voice_name}")
                            
                            # Restart session with new agent if session was already started
                            if session_started:
                                print("🔄 Restarting session with new persona...")
                                asyncio.create_task(session.stop())
                                asyncio.create_task(start_agent_session())
                        print(f"✅ user_id from metadata: {agent.user_id}, kb_id: {agent.selected_kb_id}")
                    except Exception as e:
                        print(f"⚠️ participant metadata parse error: {e}")
                if agent.user_id == "default-user":
                    agent.user_id = ident
                    print(f"ℹ️ fallback user_id = identity: {agent.user_id}")
        except Exception as e:
            print(f"⚠️ on_participant_connected error: {e}")

    def on_participant_disconnected(participant):
        try:
            print(f"👋 participantDisconnected: {getattr(participant, 'identity', None)}")
            # If this was the last user participant, stop egress and save transcript
            remaining_participants = [p for p in room.remote_participants.values() 
                                    if not getattr(p, 'identity', '').startswith('agent')]
            if len(remaining_participants) == 0:
                print("🛑 Last user disconnected, stopping egress...")
                asyncio.create_task(stop_audio_egress(room_name_str))
        except Exception as e:
            print(f"⚠️ on_participant_disconnected error: {e}")

    def on_room_metadata_changed(metadata):
        print(f"📝 roomMetadataChanged: {metadata}")

    def on_data_received(payload, participant):
        # supports JSON control messages from frontend
        try:
            if isinstance(payload, (bytes, bytearray)):
                payload = payload.decode("utf-8", errors="replace")
            msg = payload
            if isinstance(payload, str):
                try:
                    msg = json.loads(payload)
                except Exception:
                    msg = payload
            if isinstance(msg, dict):
                if msg.get("type") == "control":
                    cmd = msg.get("cmd")
                    print(f"📡 Received control '{cmd}' from {getattr(participant, 'identity', 'unknown')}")
                    if cmd == "pause":
                        agent._paused = True
                    elif cmd in ("resume", "play"):
                        agent._paused = False
                    elif cmd == "halt":
                        agent._paused = True
                        print(f"🛑 AI Agent halted by user command")
                elif msg.get("type") == "kb_selection":
                    kb_id = msg.get("kb_id")
                    if kb_id:
                        agent.selected_kb_id = kb_id
                        print(f"✅ Received KB ID from data channel: {kb_id}")
                        # Restart egress with new KB ID for proper file naming
                        if room_name_str and agent.user_id != "default-user":
                            print(f"🔄 Restarting egress with new KB ID: {kb_id}")
                            # First stop the current egress, then start new one
                            asyncio.create_task(stop_audio_egress(room_name_str))
                            asyncio.create_task(restart_egress_with_delay(room_name_str, agent.user_id, kb_id))
        except Exception as e:
            print(f"⚠️ on_data_received: {e}")

    # register events
    safe_on("participantConnected", on_participant_connected)
    safe_on("participantDisconnected", on_participant_disconnected)
    safe_on("roomMetadataChanged", on_room_metadata_changed)
    safe_on("dataReceived", on_data_received)

    # discover participants initially
    try:
        participants = []
        try:
            participants = list(getattr(room, "remote_participants", {}).values())
            if getattr(room, "local_participant", None):
                participants.append(room.local_participant)
        except Exception:
            if hasattr(room, "get_participants"):
                participants = room.get_participants()
            elif hasattr(room, "participants"):
                participants = list(room.participants.values())

        print(f"🔍 Found {len(participants)} participants at startup")
        for p in participants:
            try:
                if getattr(p, "identity", None) and not p.identity.startswith("agent"):
                    meta = getattr(p, "metadata", None)
                    if meta:
                        try:
                            parsed = json.loads(meta)
                            if "userId" in parsed:
                                agent.user_id = parsed["userId"]
                            if "selectedKbId" in parsed:
                                agent.selected_kb_id = parsed["selectedKbId"]
                            voice_name = parsed.get("voice_name")
                            if "guest_persona" in parsed:
                                # Create new agent with persona and voice
                                new_agent = GuestAgent(persona=parsed["guest_persona"], voice_name=voice_name)
                                new_agent.user_id = agent.user_id
                                new_agent.selected_kb_id = agent.selected_kb_id
                                new_agent._room = agent._room
                                agent = new_agent
                                global_agent = agent
                                print(f"🔄 Created new agent with persona: {parsed['guest_persona'].get('name', 'Unknown')}")
                                break
                        except Exception as e:
                            print(f"⚠️ Startup metadata parse error: {e}")
                    if agent.user_id == "default-user":
                        agent.user_id = p.identity
                        break
            except Exception:
                continue
    except Exception as e:
        print(f"⚠️ participant discovery error: {e}")

    print(f"🧩 Final user_id: {agent.user_id}, selected_kb_id: {agent.selected_kb_id}")

    # ---------- Simple transcription handler ----------
    def on_transcript_received(participant, text):
        try:
            speaker = getattr(participant, "identity", "unknown")
            if text and text.strip():
                print(f"📝 [{speaker}]: {text[:100]}")
        except Exception as e:
            print(f"⚠️ transcript handler error: {e}")

    # Register transcript events
    safe_on("transcriptionReceived", on_transcript_received)

    # ---------- initial RAG context & topic ----------
    # Wait a bit for data channel messages to arrive
    await asyncio.sleep(1)
    
    initial_context = ""
    topic = "the topic you shared"  # Default topic

    # ---------- start the agent session ----------
    await start_agent_session()

    # send initial greeting using SESSION_INSTRUCTION
    try:
        # fetch initial chunk context from backend
        print(f"🔍 Attempting initial context fetch for user_id: {agent.user_id}")
        import aiohttp
        async with aiohttp.ClientSession() as s:
            form = aiohttp.FormData()
            form.add_field("query", "What is this document about?")
            form.add_field("user_id", agent.user_id)
            if agent.selected_kb_id:
                form.add_field("kb_id", agent.selected_kb_id)
                print(f"🔍 Initial fetch with kb_id: {agent.selected_kb_id}")
            else:
                print(f"⚠️ No kb_id available for initial fetch")
            async with s.post("http://localhost:8000/internal/respond", data=form, timeout=aiohttp.ClientTimeout(total=60)) as resp:
                if resp.status == 200:
                    j = await resp.json()
                    initial_context = j.get("answer_text", "") or ""
                    print(f"📄 Initial chunks fetched ({len(initial_context)} chars)")
                    topic = extract_topic_from_context(initial_context) if initial_context else "the topic you shared"
                else:
                    txt = await resp.text()
                    print(f"⚠️ initial fetch failed: {txt}")
    except asyncio.TimeoutError:
        print(f"⏰ Initial context fetch timed out after 60 seconds")
        print(f"⚠️ Continuing without initial context - agent will fetch context on first user message...")
    except Exception as e:
        print(f"⚠️ initial chunks exception: {e}")
        print(f"⚠️ Exception type: {type(e)}")
        import traceback
        traceback.print_exc()
        print(f"⚠️ Continuing without initial context...")

    # AI Guest should NOT initiate conversation - wait for host to start
    print("🎤 AI Guest Session is ready! Waiting for host to start the conversation...")
    print("👤 AI Guest will respond when the host asks questions.")


if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint_guest))