# agent.py (FULL updated - Host mode, transcription listeners, proactive loop)
from dotenv import load_dotenv
import aiohttp
import json
import os
import asyncio
import time
import traceback

from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions
from livekit.agents.llm import function_tool
from livekit.plugins import noise_cancellation, google

from prompts import AGENT_INSTRUCTION, SESSION_INSTRUCTION

load_dotenv()


class Assistant(Agent):
    def __init__(self) -> None:
        # LLM for realtime reasoning (do NOT pass as tts unless you have a separate TTS model)
        llm_model = google.beta.realtime.RealtimeModel(
            model="models/gemini-2.0-flash-exp",
            temperature=0.8,
        )

        super().__init__(
            instructions=AGENT_INSTRUCTION + "\n\nIMPORTANT: Always respond in English only.",
            llm=llm_model,
            tools=[],  # function_tool methods will register tools
        )

        self.user_id = "default-user"
        self._room = None
        self.session_memory = []
        self._paused = False

    # memory helpers
    def remember(self, role: str, text: str):
        try:
            if not text:
                return
            entry = {"role": role, "text": text, "ts": time.time()}
            self.session_memory.append(entry)
            # keep memory bounded
            if len(self.session_memory) > 60:
                self.session_memory = self.session_memory[-60:]
        except Exception as e:
            print(f"⚠️ remember() error: {e}")

    def summarize_memory(self, max_chars=1200):
        try:
            texts = [f"{m['role']}: {m['text']}" for m in self.session_memory if m.get("text")]
            summary = "\n".join(texts[-12:])
            return summary[:max_chars]
        except Exception as e:
            print(f"⚠️ summarize_memory() error: {e}")
            return ""

    @function_tool()
    async def query_knowledge_base(self, query: str) -> str:
        """Call backend internal/respond to get RAG context for current user_id."""
        try:
            user_id = self.user_id or "default-user"
            print(f"🔍 RAG Query - user_id: {user_id} | query: {query[:120]}")
            async with aiohttp.ClientSession() as session:
                form = aiohttp.FormData()
                form.add_field("query", query)
                form.add_field("user_id", user_id)
                async with session.post(
                    "http://localhost:8000/internal/respond",
                    data=form,
                    timeout=aiohttp.ClientTimeout(total=40),
                ) as resp:
                    if resp.status == 200:
                        j = await resp.json()
                        ans = j.get("answer_text", "")
                        print(f"🧠 RAG returned {len(ans)} chars")
                        return ans
                    else:
                        txt = await resp.text()
                        print(f"⚠️ RAG backend error: {txt}")
                        return "I couldn't find relevant information in your documents."
        except Exception as e:
            print(f"❌ RAG exception: {e}")
            traceback.print_exc()
            return "Error querying knowledge base."


# ------------------------- Entrypoint -------------------------
async def entrypoint(ctx: agents.JobContext):
    print("🚀 Starting AI Host Agent (host-mode enabled)...")
    session = AgentSession()
    agent = Assistant()

    # connect to LiveKit (worker context)
    await ctx.connect()
    room = ctx.room
    agent._room = room

    print(f"🏠 Connected to room: {getattr(room, 'name', 'unknown')}")
    await asyncio.sleep(0.8)

    # safe event register helper
    def safe_on(event_name, handler):
        try:
            room.on(event_name, handler)
            print(f"🔔 Registered event: {event_name}")
        except Exception as e:
            print(f"⚠️ Could not register event {event_name}: {e}")

    # ---------- participant connected handler ----------
    def on_participant_connected(participant):
        try:
            print(f"🎉 participantConnected: {getattr(participant, 'identity', None)}")
            if getattr(participant, "identity", None) and not participant.identity.startswith("agent"):
                meta = getattr(participant, "metadata", None)
                if meta:
                    print(f"🔍 new participant metadata raw: {meta}")
                    try:
                        parsed = json.loads(meta)
                        if "userId" in parsed:
                            agent.user_id = parsed["userId"]
                        elif "user_id" in parsed:
                            agent.user_id = parsed["user_id"]
                        print(f"✅ Set agent.user_id from metadata: {agent.user_id}")
                    except Exception as e:
                        print(f"⚠️ participant metadata parse error: {e}")
                # fallback to identity string (email)
                if agent.user_id == "default-user":
                    agent.user_id = participant.identity
                    print(f"ℹ️ Fallback set user_id to participant.identity: {agent.user_id}")
        except Exception as e:
            print(f"⚠️ on_participant_connected error: {e}")

    def on_participant_disconnected(participant):
        try:
            print(f"👋 participantDisconnected: {getattr(participant, 'identity', None)}")
        except Exception:
            pass

    def on_room_metadata_changed(metadata):
        print(f"📝 roomMetadataChanged: {metadata}")

    # ---------- data received (control) ----------
    def on_data_received(payload, participant):
        try:
            # payload may be bytes or str
            if isinstance(payload, (bytes, bytearray)):
                payload = payload.decode("utf-8", errors="replace")
            if isinstance(payload, str):
                try:
                    msg = json.loads(payload)
                except Exception:
                    msg = payload
            else:
                msg = payload
            if isinstance(msg, dict) and msg.get("type") == "control":
                cmd = msg.get("cmd")
                print(f"📡 Received control '{cmd}' from {getattr(participant, 'identity', 'unknown')}")
                if cmd == "pause":
                    agent._paused = True
                elif cmd in ("resume", "play"):
                    agent._paused = False
        except Exception as e:
            print(f"⚠️ on_data_received error: {e}")

    # Register likely event names (use camelCase names used by LiveKit logs)
    safe_on("participantConnected", on_participant_connected)
    safe_on("participantDisconnected", on_participant_disconnected)
    safe_on("roomMetadataChanged", on_room_metadata_changed)
    safe_on("dataReceived", on_data_received)

    # ---------- try to discover existing participants and extract user_id ----------
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
                                print(f"✅ Found userId in participant metadata: {agent.user_id}")
                                break
                        except Exception:
                            pass
                    if agent.user_id == "default-user":
                        agent.user_id = p.identity
                        print(f"ℹ️ Using participant.identity as user_id: {agent.user_id}")
                        break
            except Exception:
                continue
    except Exception as e:
        print(f"⚠️ participant discovery error: {e}")

    print(f"🧩 Final user_id for session: {agent.user_id}")

    # small settle
    await asyncio.sleep(1)

    # ---------- transcription listener (many possible event names) ----------
    def make_transcript_handler():
        def handler(*args, **kwargs):
            """
            Generic handler to accept various signatures:
            - (participant, text)
            - (identity, text)
            - (data) where data contains speaker/text
            We try to extract speaker and text robustly.
            """
            try:
                speaker = None
                text = None
                # args variants
                if len(args) >= 2:
                    # common: (participant, text)
                    a0, a1 = args[0], args[1]
                    if hasattr(a0, "identity") and isinstance(a1, str):
                        speaker = getattr(a0, "identity", None)
                        text = a1
                    elif isinstance(a0, str) and isinstance(a1, str):
                        speaker = a0
                        text = a1
                elif len(args) == 1:
                    a0 = args[0]
                    if isinstance(a0, dict):
                        speaker = a0.get("speaker") or a0.get("identity")
                        text = a0.get("text") or a0.get("transcript") or a0.get("utterance")
                    elif isinstance(a0, str):
                        # single text message
                        text = a0
                # fallback kwargs
                if not text:
                    text = kwargs.get("text") or kwargs.get("transcript") or kwargs.get("utterance")
                if not speaker:
                    speaker = kwargs.get("speaker") or kwargs.get("identity")

                if text and speaker:
                    # only treat non-agent participants as guest
                    if isinstance(speaker, str) and not str(speaker).startswith("agent"):
                        print(f"📝 Transcription from {speaker}: {text[:120]}")
                        agent.remember("guest", text)
                elif text:
                    # unknown speaker — still remember as guest fallback
                    print(f"📝 Transcription (unknown speaker): {text[:120]}")
                    agent.remember("guest", text)
            except Exception as e:
                print(f"⚠️ transcript handler error: {e}")
        return handler

    transcript_handler = make_transcript_handler()
    # try many event names commonly used by integrations
    possible_transcript_events = [
        "transcriptionReceived", "transcriptReceived", "transcription", "transcript",
        "transcriptionEvent", "transcriptEvent", "speechDetected"
    ]
    for ev in possible_transcript_events:
        safe_on(ev, transcript_handler)

    # ---------- fetch initial context (RAG) ----------
    initial_context = await fetch_initial_chunks(agent.user_id)
    if initial_context:
        init_message = "Hello! I’ve loaded your knowledge base. Here’s what I found:\n" + initial_context[:400]
    else:
        init_message = "Hello! I couldn’t find any uploaded documents for you yet."

    # ---------- start session (LLM) ----------
    await session.start(
        room=room,
        agent=agent,
        room_input_options=RoomInputOptions(
            video_enabled=False,
            noise_cancellation=noise_cancellation.BVC(),
        ),
    )

    print("🎤 AI Host Session Started Successfully!")

    # Use generate_reply with instructions (don't use text=)
    try:
        await session.generate_reply(instructions=SESSION_INSTRUCTION)
        agent.remember("host", init_message)
        print(f"💬 Initial host instructions sent (SESSION_INSTRUCTION).")
    except Exception as e:
        print(f"⚠️ generate_reply error: {e}")

    # ---------- Proactive Host Loop (asks follow-ups automatically) ----------
    async def host_loop():
        # wait a bit before first proactive question
        await asyncio.sleep(5)
        while True:
            try:
                if agent._paused:
                    # if paused, skip asking
                    await asyncio.sleep(3)
                    continue

                # Build a prompt for a follow-up question using recent memory
                recent = agent.summarize_memory(max_chars=1000)
                prompt = (
                    "You are the podcast Host. Based on the recent short summary of the conversation below, "
                    "ask one concise, engaging follow-up question to the guest that moves the discussion forward. "
                    "Keep it natural and friendly.\n\n"
                    f"Recent conversation:\n{recent}\n\nFollow-up question:"
                )

                print("🔁 Host loop: generating follow-up question...")
                # Use generate_reply with instructions so Gemini produces spoken reply (via Realtime)
                await session.generate_reply(instructions=prompt)
                # wait a configurable delay before next proactive question
                await asyncio.sleep(12)  # you can tweak this interval
            except Exception as e:
                print(f"⚠️ Host loop exception: {e}")
                traceback.print_exc()
                await asyncio.sleep(5)

    # start host loop in background
    asyncio.create_task(host_loop())

    # Nothing more here; agent session will run until worker is stopped or room disconnects.


# ---------------------------------------------------------------------
# helper: fetch initial chunks from backend internal/respond
# ---------------------------------------------------------------------
async def fetch_initial_chunks(user_id: str) -> str:
    try:
        print(f"📄 Fetch initial chunks for: {user_id}")
        async with aiohttp.ClientSession() as session:
            form = aiohttp.FormData()
            form.add_field("query", "Tell me about the document I uploaded")
            form.add_field("user_id", user_id)
            async with session.post(
                "http://localhost:8000/internal/respond",
                data=form,
                timeout=aiohttp.ClientTimeout(total=25),
            ) as resp:
                if resp.status == 200:
                    j = await resp.json()
                    ctx = j.get("answer_text", "")
                    print(f"📄 Initial chunks context fetched ({len(ctx)} chars).")
                    return ctx
                else:
                    txt = await resp.text()
                    print(f"⚠️ fetch_initial_chunks failed: {txt}")
    except Exception as e:
        print(f"⚠️ fetch_initial_chunks exception: {e}")
    return ""


if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
