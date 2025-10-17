from dotenv import load_dotenv
import aiohttp
import asyncio
import time
import traceback
import re
import json
from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions
from livekit.agents.llm import function_tool
from livekit.plugins import noise_cancellation, google

from prompts import AGENT_INSTRUCTION , SESSION_INSTRUCTION

load_dotenv()

# ---------- Agent class ----------
class Assistant(Agent):
    def __init__(self) -> None:
        llm_model = google.beta.realtime.RealtimeModel(
            model="models/gemini-2.0-flash-exp",
            temperature=0.8,
        )

        super().__init__(
            instructions=AGENT_INSTRUCTION + "\n\nIMPORTANT: Always respond in English only.",
            llm=llm_model,
            tools=[],
        )

        self.user_id = "default-user"
        self.selected_kb_id = None  
        self._room = None
        self._paused = False

    @function_tool()
    async def query_knowledge_base(self, query: str) -> str:
        """Call backend /internal/respond to get context chunks for user."""
        try:
            uid = self.user_id or "default-user"
            kb_id = self.selected_kb_id
            
            # Check if we have a valid knowledge base ID
            if not kb_id:
                print(f"⚠️ No knowledge base selected (kb_id=None) for user {uid}")
                return "I don't have access to your knowledge base yet. Please make sure you've selected a knowledge base for this session."
            
            print(f"🔍 RAG query for user_id={uid}, kb_id={kb_id} (q={query[:80]})")
            async with aiohttp.ClientSession() as session:
                form = aiohttp.FormData()
                form.add_field("query", query)
                form.add_field("user_id", uid)
                form.add_field("kb_id", kb_id)
                async with session.post(
                    "http://localhost:8000/internal/respond", data=form,
                    timeout=aiohttp.ClientTimeout(total=120)
                ) as resp:
                    if resp.status == 200:
                        j = await resp.json()
                        context = j.get("answer_text", "No relevant information was found in your notes.")
                        print(f"📄 RAG result received ({len(context)} chars)")
                        print(f"📄 Context preview: {context[:200]}...")
                        return context
                    else:
                        txt = await resp.text()
                        print(f"⚠️ RAG backend error: {txt}")
                        return "I couldn't find relevant information in your documents."
        except asyncio.TimeoutError:
            print(f"❌ query_knowledge_base timed out after 120 seconds")
            return "I'm having trouble accessing your documents right now. Please try again."
        except Exception as e:
            print(f"❌ query_knowledge_base exception: {e}")
            traceback.print_exc()
            return "Error querying knowledge base."

# ---------- Helper: topic extraction ----------
def extract_topic_from_context(context: str) -> str:
    """
    Try to pull a short 'topic' phrase from context:
    - first heading line
    - or first sentence under 100 chars
    """
    if not context:
        return "this topic"
    # try first non-empty line
    lines = [ln.strip() for ln in context.splitlines() if ln.strip()]
    if lines:
        first = lines[0]
        # If first line is long, try first sentence
        first_sent = re.split(r'\.|\n', first)[0].strip()
        if len(first_sent) <= 120:
            # sanitize
            first_sent = re.sub(r'\s+', ' ', first_sent)
            return first_sent
    # fallback: first sentence of full context
    m = re.search(r'(.{10,120}?)\.', context)
    if m:
        return m.group(1).strip()
    return "this topic"

# ---------- Entrypoint ----------
async def entrypoint(ctx: agents.JobContext):
    print("🚀 Starting AI Host Agent (improved host behavior)...")

    session = AgentSession()
    agent = Assistant()

    # connect to LiveKit
    await ctx.connect()
    room = ctx.room
    agent._room = room

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
                        print(f"✅ user_id from metadata: {agent.user_id}, kb_id: {agent.selected_kb_id}")
                        
                        # Start egress now that we have proper user_id and kb_id
                        # if agent.user_id != "default-user" and room_name_str:
                        #     print(f"🎬 Starting egress with proper metadata...")
                        #     asyncio.create_task(trigger_audio_egress(room_name_str, agent.user_id, agent.selected_kb_id))
                            
                    except Exception as e:
                        print(f"⚠️ participant metadata parse error: {e}")
                if agent.user_id == "default-user":
                    agent.user_id = ident
                    print(f"ℹ️ fallback user_id = identity: {agent.user_id}")
                    
                    # Start egress with fallback user_id
                    # if room_name_str:
                    #     print(f"🎬 Starting egress with fallback user_id...")
                    #     asyncio.create_task(trigger_audio_egress(room_name_str, agent.user_id, agent.selected_kb_id))
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
                                # Start egress if we have proper metadata
                                # if agent.user_id != "default-user" and room_name_str:
                                #     print(f"🎬 Starting egress from startup discovery...")
                                #     asyncio.create_task(trigger_audio_egress(room_name_str, agent.user_id, agent.selected_kb_id))
                                break
                        except Exception as e:
                            print(f"⚠️ Startup metadata parse error: {e}")
                    if agent.user_id == "default-user":
                        agent.user_id = p.identity
                        # Start egress with fallback user_id
                        # if room_name_str:
                        #     print(f"🎬 Starting egress from startup fallback...")
                        #     asyncio.create_task(trigger_audio_egress(room_name_str, agent.user_id, agent.selected_kb_id))
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
    try:
        await session.start(
            room=room,
            agent=agent,
            room_input_options=RoomInputOptions(
                video_enabled=False,
                noise_cancellation=noise_cancellation.BVC(),
            ),
        )
        print("🎤 AI Host Session Started Successfully!")
        
        # Transcript will be automatically generated by LiveKit egress
        print(f"📝 Transcript will be automatically generated by egress")
        
    except Exception as e:
        print(f"❌ Failed to start agent session: {e}")
        traceback.print_exc()
        return

    # send initial greeting using SESSION_INSTRUCTION
    try:
        # fetch initial chunk context from backend
        print(f"🔍 Attempting initial context fetch for user_id: {agent.user_id}")
        async with aiohttp.ClientSession() as s:
            form = aiohttp.FormData()
            form.add_field("query", "Tell me about the document I uploaded")
            form.add_field("user_id", agent.user_id)
            if agent.selected_kb_id:
                form.add_field("kb_id", agent.selected_kb_id)
                print(f"🔍 Initial fetch with kb_id: {agent.selected_kb_id}")
            else:
                print(f"⚠️ No kb_id available for initial fetch")
            async with s.post("http://localhost:8000/internal/respond", data=form, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                if resp.status == 200:
                    j = await resp.json()
                    initial_context = j.get("answer_text", "") or ""
                    print(f"📄 Initial chunks fetched ({len(initial_context)} chars)")
                    topic = extract_topic_from_context(initial_context) if initial_context else "the topic you shared"
                else:
                    txt = await resp.text()
                    print(f"⚠️ initial fetch failed: {txt}")
    except Exception as e:
        print(f"⚠️ initial chunks exception: {e}")
        print(f"⚠️ Exception type: {type(e)}")
        import traceback
        traceback.print_exc()
        print(f"⚠️ Continuing without initial context...")

    # craft initial greeting instruction — avoid the word 'document'
    init_instruction = (
        f"You are PODHOST. Greet the guest warmly and in one sentence mention the topic: '{topic}'. "
        "Briefly (one short sentence) summarize what you found, then ask a light, open-ended opening question to start the conversation."
    )

    try:
        # Use generate_reply only with instructions (no text=)
        await session.generate_reply(instructions=init_instruction)
        
        print("💬 Initial greeting/instruction sent.")
    except Exception as e:
        print(f"⚠️ generate_reply(initial) error: {e}")
        traceback.print_exc()
        print("⚠️ Continuing without initial greeting...")

    print("🎤 AI Host Session is ready! The agent will respond to user messages using RAG.")
    

async def trigger_audio_egress(room_name: str, user_id: str = None, kb_id: str = None):
    """Trigger backend route to start LiveKit audio egress with improved error handling."""
    try:
        async with aiohttp.ClientSession() as session:
            url = "http://localhost:8000/livekit/start-audio-egress"
            data = {"room_name": room_name}
            
            # Add user_id and kb_id for custom file naming
            if user_id:
                data["user_id"] = user_id
            if kb_id:
                data["kb_id"] = kb_id
            
            print(f"🎬 Triggering audio egress for room: {room_name}")
            print(f"👤 User ID: {user_id}")
            print(f"📚 KB ID: {kb_id}")
            print(f"🔗 Egress URL: {url}")
            
            async with session.post(url, data=data, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                txt = await resp.text()
                
                if resp.status == 200:
                    try:
                        response_data = json.loads(txt) if txt else {}
                        if response_data.get("success"):
                            print(f"✅ Audio egress started successfully for room: {room_name}")
                            print(f"   Egress ID: {response_data.get('egress_id', 'unknown')}")
                            print(f"   Status: {response_data.get('status', 'unknown')}")
                        else:
                            error_msg = response_data.get("error", "Unknown error")
                            status = response_data.get("status", "unknown")
                            
                            if status == "quota_exceeded":
                                print(f"⚠️ Egress quota exceeded - continuing without recording")
                                print(f"   Message: {response_data.get('message', 'Recording disabled')}")
                            else:
                                print(f"⚠️ Egress failed: {error_msg}")
                    except json.JSONDecodeError:
                        print(f"✅ Audio egress started successfully for room: {room_name}")
                        print(f"   Response: {txt}")
                else:
                    print(f"⚠️ Failed to start egress: HTTP {resp.status}")
                    print(f"   Response: {txt}")
                    
    except asyncio.TimeoutError:
        print(f"⏰ Timeout while starting egress for room: {room_name}")
    except Exception as e:
        print(f"❌ Exception in trigger_audio_egress: {e}")
        import traceback
        traceback.print_exc()

async def stop_audio_egress(room_name: str):
    """Stop LiveKit audio egress and trigger file processing."""
    try:
        async with aiohttp.ClientSession() as session:
            url = "http://localhost:8000/livekit/stop-audio-egress"
            data = {"room_name": room_name}
            
            print(f"🛑 Stopping audio egress for room: {room_name}")
            print(f"🔗 Stop Egress URL: {url}")
            
            async with session.post(url, data=data, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                txt = await resp.text()
                
                if resp.status == 200:
                    try:
                        response_data = json.loads(txt) if txt else {}
                        if response_data.get("success"):
                            print(f"✅ Audio egress stopped successfully for room: {room_name}")
                            print(f"   Egress ID: {response_data.get('egress_id', 'unknown')}")
                            print(f"   Status: {response_data.get('status', 'unknown')}")
                        else:
                            error_msg = response_data.get("error", "Unknown error")
                            print(f"⚠️ Stop egress failed: {error_msg}")
                    except json.JSONDecodeError:
                        print(f"✅ Audio egress stopped successfully for room: {room_name}")
                        print(f"   Response: {txt}")
                else:
                    print(f"⚠️ Failed to stop egress: HTTP {resp.status}")
                    print(f"   Response: {txt}")
                    
    except asyncio.TimeoutError:
        print(f"⏰ Timeout while stopping egress for room: {room_name}")
    except Exception as e:
        print(f"❌ Exception in stop_audio_egress: {e}")
        import traceback
        traceback.print_exc()


async def restart_egress_with_delay(room_name: str, user_id: str, kb_id: str):
    """Restart egress with a small delay to ensure stop completes."""
    await asyncio.sleep(1)  # Small delay to ensure stop completes
    await trigger_audio_egress(room_name, user_id, kb_id)

if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
