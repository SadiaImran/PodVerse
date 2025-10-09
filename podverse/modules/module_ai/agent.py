# agent.py — Host-mode improved: silence-aware, topic-extract, behavior rotation
from dotenv import load_dotenv
import aiohttp
import json
import os
import asyncio
import time
import traceback
import re

from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions
from livekit.agents.llm import function_tool
from livekit.plugins import noise_cancellation, google

# prompts.py should contain AGENT_INSTRUCTION and SESSION_INSTRUCTION (you said you updated it)
from prompts import AGENT_INSTRUCTION, SESSION_INSTRUCTION

load_dotenv()

# ---------- CONFIG ----------
SILENCE_THRESHOLD = 9         # seconds of guest silence before host asks follow-up
INITIAL_WAIT_BEFORE_HOST = 2  # seconds after session start before initial greeting logic
HOST_LOOP_INTERVAL = 12       # seconds between proactive checks (if silent)
MAX_MEMORY_CHUNKS = 60
MAX_SUMMARY_CHARS = 1000

# ---------- Agent class ----------
class Assistant(Agent):
    def __init__(self) -> None:
        llm_model = google.beta.realtime.RealtimeModel(
            # keep same model you used before
            model="models/gemini-2.0-flash-exp",
            temperature=0.7,
        )

        super().__init__(
            instructions=AGENT_INSTRUCTION + "\n\nIMPORTANT: Always respond in English only.",
            llm=llm_model,
            tools=[],
        )

        self.user_id = "default-user"
        self.selected_kb_id = None  # Store selected knowledge base ID
        self._room = None
        self.session_memory = []  # list of dicts: {role, text, ts}
        self._paused = False
        # track last speech timestamps
        self.last_guest_speech_ts = 0.0
        self.last_agent_speech_ts = 0.0

    # memory helpers
    def remember(self, role: str, text: str):
        """Store conversation turns; keep bounded length."""
        if not text or not isinstance(text, str):
            return
        # avoid storing internal prompts or extremely short noises
        t = text.strip()
        if len(t) < 2:
            return
        self.session_memory.append({"role": role, "text": t, "ts": time.time()})
        if len(self.session_memory) > MAX_MEMORY_CHUNKS:
            self.session_memory = self.session_memory[-MAX_MEMORY_CHUNKS:]

    def summarize_memory(self, max_chars=MAX_SUMMARY_CHARS):
        """Return simple concatenated recent messages as short context."""
        texts = []
        for m in self.session_memory[-12:]:
            r = m.get("role", "user")
            txt = m.get("text", "")
            texts.append(f"{r}: {txt}")
        summary = "\n".join(texts)
        return summary[:max_chars]


    @function_tool()
    async def query_knowledge_base(self, query: str) -> str:
        """Call backend /internal/respond to get context chunks for user."""
        try:
            uid = self.user_id or "default-user"
            kb_id = self.selected_kb_id
            print(f"🔍 RAG query for user_id={uid}, kb_id={kb_id} (q={query[:80]})")
            async with aiohttp.ClientSession() as session:
                form = aiohttp.FormData()
                form.add_field("query", query)
                form.add_field("user_id", uid)
                if kb_id:
                    form.add_field("kb_id", kb_id)
                async with session.post(
                    "http://localhost:8000/internal/respond", data=form,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as resp:
                    if resp.status == 200:
                        j = await resp.json()
                        return j.get("answer_text", "")
                    else:
                        txt = await resp.text()
                        print(f"⚠️ RAG backend error: {txt}")
                        return "I couldn't find relevant information in your documents."
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
        except Exception:
            pass

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
    
    # Debug: Check if we can get metadata from room
    try:
        print(f"🔍 Room metadata: {getattr(room, 'metadata', None)}")
        if hasattr(room, 'participants'):
            for p_id, p in room.participants.items():
                print(f"🔍 Participant {p_id}: identity={getattr(p, 'identity', None)}, metadata={getattr(p, 'metadata', None)}")
    except Exception as e:
        print(f"⚠️ Room metadata debug error: {e}")

    # ---------- transcription handler ----------
    # This handler is general: it attempts to extract speaker and text from various signatures.
    def make_transcript_handler():
        def handler(*args, **kwargs):
            try:
                speaker = None
                text = None
                # Typical signature: (participant, text)
                if len(args) >= 2:
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
                        text = a0
                # kwargs fallback
                if not text:
                    text = kwargs.get("text") or kwargs.get("transcript") or kwargs.get("utterance")
                if not speaker:
                    speaker = kwargs.get("speaker") or kwargs.get("identity")

                if text:
                    text = text.strip()
                if not text:
                    return

                # Determine if this is agent speech — skip remembering agent's own speech
                sstr = str(speaker) if speaker is not None else ""
                # Some agent identities start with "agent" or "assistant"; adjust as needed
                if sstr.lower().startswith("agent") or sstr.lower().startswith("assistant") or "host" in sstr.lower():
                    # agent utterance — update agent timestamp but do NOT remember it
                    agent.last_agent_speech_ts = time.time()
                    # print debug
                    # print(f"ℹ️ Ignoring self speech from {sstr}: {text[:80]}")
                    return
                else:
                    # guest / user utterance
                    agent.last_guest_speech_ts = time.time()
                    agent.remember("guest", text)
                    print(f"📝 Guest [{sstr}]: {text[:140]}")
            except Exception as e:
                print(f"⚠️ transcript handler error: {e}")
        return handler

    transcript_handler = make_transcript_handler()
    # register for common event names
    for ev in ["transcriptionReceived", "transcriptReceived", "transcription", "transcript", "speechDetected"]:
        safe_on(ev, transcript_handler)

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
    except Exception as e:
        print(f"❌ Failed to start agent session: {e}")
        traceback.print_exc()
        return

    # Now fetch initial context after session is started
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
            async with s.post("http://localhost:8000/internal/respond", data=form, timeout=aiohttp.ClientTimeout(total=10)) as resp:
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

    # send initial greeting & instruction
    try:
        # Use generate_reply only with instructions (no text=)
        await session.generate_reply(instructions=init_instruction)
        agent.remember("host", f"[host intro about: {topic}]")
        agent.last_agent_speech_ts = time.time()
        
        print("💬 Initial greeting/instruction sent.")
    except Exception as e:
        print(f"⚠️ generate_reply(initial) error: {e}")
        traceback.print_exc()
        print("⚠️ Continuing without initial greeting...")

    # ----------- Smart Host Loop (RAG-aware & silence-sensitive) -----------
    modes = ["ask", "reflect", "riff"]
    mode_idx = 0
    has_user_spoken = False
    silence_warning_issued = False

    async def host_loop():
        nonlocal mode_idx, has_user_spoken, silence_warning_issued
        await asyncio.sleep(5)  # let everything settle first

        print("🕓 Host loop started (monitoring silence & context)...")
        while True:
            try:
                now = time.time()
                last_guest = agent.last_guest_speech_ts
                last_agent = agent.last_agent_speech_ts

                # Mark if user has ever spoken yet
                if last_guest > 0:
                    has_user_spoken = True

                # Don’t interrupt if agent just spoke recently
                if (now - last_agent) < 4:
                    await asyncio.sleep(2)
                    continue

                # Check silence duration
                silence_for = now - last_guest if last_guest else None

                if has_user_spoken and silence_for and silence_for > SILENCE_THRESHOLD:
                    # Prevent spamming
                    if silence_warning_issued and (now - last_agent) < (SILENCE_THRESHOLD * 2):
                        await asyncio.sleep(2)
                        continue

                    silence_warning_issued = True
                    print(f"🤫 Detected guest silence for {silence_for:.1f}s — generating next host follow-up...")

                    # Get last meaningful user line
                    last_user_msg = ""
                    for m in reversed(agent.session_memory):
                        if m["role"] == "guest" and len(m["text"]) > 3:
                            last_user_msg = m["text"]
                            break

                    if not last_user_msg:
                        last_user_msg = "something you said earlier"

                    # Use document RAG as context
                    doc_hint = await agent.query_knowledge_base(f"related to {last_user_msg}")

                    # Alternate between 3 styles
                    mode = modes[mode_idx % len(modes)]
                    mode_idx += 1

                    if mode == "ask":
                        prompt = (
                            f"The guest said: '{last_user_msg}'. "
                            f"From your notes you recall: {doc_hint[:400]}.\n"
                            "Now as a podcast host, ask a friendly, engaging follow-up question "
                            "that connects their last point and something from the notes."
                            "Add a little personality, curiosity or humor — make it sound human."
                        )
                    elif mode == "reflect":
                        prompt = (
                            f"The guest just shared: '{last_user_msg}'. "
                            "Respond warmly — reflect or empathize briefly, "
                            "then add a small insightful observation drawn from your notes."
                        )
                    else:  # riff mode = spontaneous comment
                        prompt = (
                            f"The guest last talked about '{last_user_msg}'. "
                            "Say something natural and witty that keeps the conversation going, "
                            "as if a human host is riffing or reacting casually."
                        )

                    print(f"🎙️ Host follow-up ({mode}) - generating contextual reply...")
                    reply = await session.generate_reply(instructions=prompt)

                    if isinstance(reply, str):
                        reply = re.sub(
                            r"(You are .*?host.*?:|Rule:|Document:|System prompt:).*",
                            "",
                            reply,
                            flags=re.I,
                        ).strip()

                    if reply:
                        print(f"💬 Host says: {reply[:150]}...")
                        agent.remember("host", reply)
                        agent.last_agent_speech_ts = time.time()
                        silence_warning_issued = False

                await asyncio.sleep(2)
            except Exception as e:
                print(f"⚠️ host_loop error: {e}")
                traceback.print_exc()
                await asyncio.sleep(5)

    # run host loop in background
    try:
        asyncio.create_task(host_loop())
        print("🕓 Host loop task created successfully")
    except Exception as e:
        print(f"⚠️ Failed to create host loop task: {e}")
        traceback.print_exc()

    # end of entrypoint — session runs until room disconnects




# ---------- helper: fetch initial chunks (standalone, if needed) ----------
async def fetch_initial_chunks(user_id: str) -> str:
    try:
        async with aiohttp.ClientSession() as s:
            form = aiohttp.FormData()
            form.add_field("query", "Tell me about the document I uploaded")
            form.add_field("user_id", user_id)
            async with s.post("http://localhost:8000/internal/respond", data=form, timeout=aiohttp.ClientTimeout(total=25)) as resp:
                if resp.status == 200:
                    j = await resp.json()
                    return j.get("answer_text", "")
    except Exception as e:
        print(f"⚠️ fetch_initial_chunks error: {e}")
    return ""



if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
