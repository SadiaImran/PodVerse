from dotenv import load_dotenv
import aiohttp
import asyncio
import traceback
import json
from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions
from livekit.agents.llm import function_tool
from livekit.plugins import noise_cancellation, google

try:
    from prompts.prompts_host import AGENT_INSTRUCTION, SESSION_INSTRUCTION
    from agents.base_agent import (
        query_knowledge_base,
        extract_topic_from_context,
        trigger_audio_egress,
        stop_audio_egress,
        restart_egress_with_delay
    )
except ImportError:
    import sys
    import os
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from prompts.prompts_host import AGENT_INSTRUCTION, SESSION_INSTRUCTION
    from agents.base_agent import (
        query_knowledge_base,
        extract_topic_from_context,
        trigger_audio_egress,
        stop_audio_egress,
        restart_egress_with_delay
    )

load_dotenv()

# ========== DEFINE KB STRICT PREFIX AT MODULE LEVEL ==========
KB_STRICT_PREFIX = """CRITICAL RULES FOR THIS RESPONSE:
- You ONLY discuss content from the uploaded knowledge base
- Do NOT add external examples, knowledge, or assumptions
- Do NOT ask about things not mentioned in the document
- Reference specific parts of what they've shared
- If something isn't covered in their KB, do NOT ask about it
- Stay focused on THEIR content only

Now continue the conversation naturally:
"""

# ---------- Host Agent class ----------
class HostAgent(Agent):
    def __init__(self, voice_name=None) -> None:
        llm_model = google.beta.realtime.RealtimeModel(
            model="models/gemini-2.0-flash-exp",
            temperature=0.8,
            voice=voice_name if voice_name else None,  # Use provided voice or default
        )

        super().__init__(
            instructions=AGENT_INSTRUCTION + "\n\nIMPORTANT: Always respond in English only.\n\n**VOICE INSTRUCTION: Use a professional, informative voice tone that matches a podcast host personality.**",
            llm=llm_model,
            tools=[],
        )

        self.user_id = "default-user"
        self.selected_kb_id = None  
        self._room = None
        self._paused = False
        self._session = None

        # Conversation flow tracking
        self.conversation_flow = None 
        self.current_topic_index = 0   
        self.questions_asked = set()  
        self.topics_covered = set()
        self._closing_triggered = False

    @function_tool()
    async def query_knowledge_base(self, query: str) -> str:
        """Call backend /internal/respond to get context chunks for user."""
        try:
            uid = self.user_id or "default-user"
            kb_id = self.selected_kb_id
            
            if not kb_id:
                print(f"⚠️ No knowledge base selected (kb_id=None) for user {uid}")
                return "I don't have access to your knowledge base yet. Please make sure you've selected a knowledge base for this session."
            
            flow_context = self.get_current_topic_context()
            enhanced_query = query
            if flow_context:
                enhanced_query = f"{query}\n\n[Internal context: {flow_context}]"
            
            print(f"🔍 RAG query for user_id={uid}, kb_id={kb_id}")
            print(f"   Query: {query[:80]}...")
            
            async with aiohttp.ClientSession() as session:
                form = aiohttp.FormData()
                form.add_field("query", enhanced_query)
                form.add_field("user_id", uid)
                form.add_field("kb_id", kb_id)
                async with session.post(
                    "http://localhost:8000/internal/respond", data=form,
                    timeout=aiohttp.ClientTimeout(total=120)
                ) as resp:
                    if resp.status == 200:
                        j = await resp.json()
                        context = j.get("answer_text", "No relevant information was found in your notes.")
                        
                        if self.conversation_flow:
                            next_q = self.get_next_question()
                            if next_q:
                                context += f"\n\n[Consider naturally transitioning to: {next_q}]"
                            elif not self._closing_triggered:
                                context += "\n\n[INTERNAL: All planned topics covered. After answering this naturally, smoothly transition to closing remarks in your next response.]"
                        
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

    async def fetch_conversation_flow(self) -> dict:
        """Fetch conversation flow from backend."""
        try:
            if not self.selected_kb_id:
                print("⚠️ No kb_id for flow fetch")
                return None
                
            print(f"📋 Fetching conversation flow for kb_id={self.selected_kb_id}")
            async with aiohttp.ClientSession() as session:
                form = aiohttp.FormData()
                form.add_field("user_id", self.user_id)
                form.add_field("kb_id", self.selected_kb_id)
                
                async with session.post(
                    "http://localhost:8000/internal/get-conversation-flow",
                    data=form,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as resp:
                    if resp.status == 200:
                        result = await resp.json()
                        if result.get("success") and result.get("flow"):
                            self.conversation_flow = result["flow"]
                            print(f"✅ Flow loaded: {len(self.conversation_flow.get('topics', []))} topics")
                            return self.conversation_flow
                        else:
                            print(f"⚠️ Flow generation failed or empty")
                            return None
                    else:
                        print(f"⚠️ Flow fetch failed: {resp.status}")
                        return None
                        
        except Exception as e:
            print(f"❌ fetch_conversation_flow error: {e}")
            traceback.print_exc()
            return None

    def get_next_question(self) -> str:
        """Get the next question to ask based on conversation flow."""
        if not self.conversation_flow or "topics" not in self.conversation_flow:
            return None
        
        topics = self.conversation_flow["topics"]
        
        if self.current_topic_index < len(topics):
            current_topic = topics[self.current_topic_index]
            topic_title = current_topic["title"]
            
            for question in current_topic["questions"]:
                if question not in self.questions_asked:
                    self.questions_asked.add(question)
                    return question
            
            self.topics_covered.add(topic_title)
            self.current_topic_index += 1
            
            if self.current_topic_index < len(topics):
                next_topic = topics[self.current_topic_index]
                first_question = next_topic["questions"][0]
                self.questions_asked.add(first_question)
                return first_question
        
        return None

    def get_current_topic_context(self) -> str:
        """Get context about current topic and remaining topics."""
        if not self.conversation_flow or "topics" not in self.conversation_flow:
            return ""
        
        topics = self.conversation_flow["topics"]
        
        if self.current_topic_index >= len(topics):
            return "All topics have been covered. Prepare to wrap up the conversation gracefully."
        
        current_topic = topics[self.current_topic_index]
        remaining_topics = [t["title"] for t in topics[self.current_topic_index + 1:]]
        
        context = f"Current topic: {current_topic['title']}\n"
        if remaining_topics:
            context += f"Remaining topics to cover: {', '.join(remaining_topics)}\n"
        
        return context

    def should_transition_topic(self, user_response_length: int) -> bool:
        """Decide if it's a good time to move to next topic."""
        if not self.conversation_flow:
            return False
        
        if user_response_length < 50:
            return False
        
        current_topic_questions = len([q for q in self.questions_asked 
                                    if any(q in topic["questions"] 
                                            for topic in [self.conversation_flow["topics"][self.current_topic_index]])])
        
        return current_topic_questions >= 2

    async def check_and_close_if_complete(self) -> bool:
        """
        Check if all topics are covered and generate closing if so.
        Returns True if closing was triggered, False otherwise.
        """
        if not self.conversation_flow or self._closing_triggered:
            return False
        
        topics = self.conversation_flow.get("topics", [])
        
        if self.current_topic_index >= len(topics):
            print("🎬 All topics covered - generating closing remarks...")
            self._closing_triggered = True
            
            doc_title = self.conversation_flow.get("doc_title", "your work")
            
            # ========== USE KB_STRICT_PREFIX HERE ==========
            closing_instruction = f"""{KB_STRICT_PREFIX}
The interview is complete! You've covered all the planned topics about "{doc_title}".

Now deliver a warm, authentic podcast closing based ONLY on what was discussed from their document:

1. Thank the guest enthusiastically (one sentence)
2. Briefly recap 2-3 key highlights from the conversation (2-3 sentences)
3. Give a memorable final thought or takeaway (one sentence)
4. End with a friendly sign-off like "Thanks for joining us today!" or "Until next time!"

Make it feel like a real podcast ending - genuine, warm, and leaving the audience satisfied.
DO NOT ask any more questions. DO NOT introduce external knowledge.
This is the FINAL closing statement."""

            try:
                if self._session:
                    await self._session.generate_reply(instructions=closing_instruction)
                    print("✅ Closing remarks delivered")
                    return True
                else:
                    print("⚠️ No session available for closing")
            except Exception as e:
                print(f"⚠️ Error generating closing: {e}")
                traceback.print_exc()
        
        return False


# ---------- Entrypoint ----------
async def entrypoint_host(ctx: agents.JobContext):
    print("🚀 Starting AI Host Agent (KB-strict mode)...")

    session = AgentSession()
    agent = HostAgent()
    agent._session = session

    await ctx.connect()
    room = ctx.room
    agent._room = room

    print(f"🏠 Connected to room: {getattr(room, 'name', 'unknown')}")
    await asyncio.sleep(0.6)

    room_name_str = getattr(room, 'name', 'my-room')
    print(f"🎬 Will start recording after participant connects with metadata...")

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
        except Exception as e:
            print(f"⚠️ on_data_received: {e}")

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

    def on_transcript_received(participant, text):
        try:
            speaker = getattr(participant, "identity", "unknown")
            if text and text.strip():
                print(f"📝 [{speaker}]: {text[:100]}")
        except Exception as e:
            print(f"⚠️ transcript handler error: {e}")

    safe_on("transcriptionReceived", on_transcript_received)

    await asyncio.sleep(1)

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
        print(f"📝 Transcript will be automatically generated by egress")
        
    except Exception as e:
        print(f"❌ Failed to start agent session: {e}")
        traceback.print_exc()
        return

    print(f"📋 Fetching conversation flow...")
    try:
        await agent.fetch_conversation_flow()
    except Exception as e:
        print(f"⚠️ Flow fetch failed: {e}")
        traceback.print_exc()

    initial_context = ""
    doc_title = "your uploaded content"

    if agent.conversation_flow:
        doc_title = agent.conversation_flow.get("doc_title", doc_title)
        print(f"✅ Using flow with document: {doc_title}")
        
        first_question = agent.get_next_question()
        
        if first_question:
            print(f"❓ First question from flow: {first_question}")
            
            try:
                print(f"🔍 Fetching context for opening question...")
                async with aiohttp.ClientSession() as s:
                    form = aiohttp.FormData()
                    form.add_field("query", first_question)
                    form.add_field("user_id", agent.user_id)
                    if agent.selected_kb_id:
                        form.add_field("kb_id", agent.selected_kb_id)
                        
                    async with s.post(
                        "http://localhost:8000/internal/respond",
                        data=form,
                        timeout=aiohttp.ClientTimeout(total=60)
                    ) as resp:
                        if resp.status == 200:
                            j = await resp.json()
                            initial_context = j.get("answer_text", "")
                            print(f"📄 Context fetched for opening ({len(initial_context)} chars)")
                        else:
                            txt = await resp.text()
                            print(f"⚠️ Context fetch failed: {txt}")
            except asyncio.TimeoutError:
                print(f"⏰ Initial context fetch timed out - proceeding without context")
            except Exception as e:
                print(f"⚠️ Initial context fetch error: {e}")
                traceback.print_exc()
            
            # ========== USE KB_STRICT_PREFIX IN INITIAL GREETING ==========
            init_instruction = f"""{KB_STRICT_PREFIX}
You are PODHOST starting a podcast interview about "{doc_title}".

Context from the document:
{initial_context[:1000] if initial_context else "Opening the conversation..."}

Your opening should:
1. Greet the guest warmly (one sentence)
2. Briefly mention you'll be exploring "{doc_title}" (one sentence)
3. Give a 1-2 sentence teaser based on the context above
4. Ask this opening question naturally: "{first_question}"

Make it sound like a real podcast opening - enthusiastic but not over the top.
DO NOT mention "documents", "uploads", or "chunks" - just reference "your work" or "your project".
REMEMBER: Only ask about content that's in their document. Do not speculate or add external knowledge."""

        else:
            print("⚠️ Flow exists but no questions found")
            init_instruction = f"""{KB_STRICT_PREFIX}
You are PODHOST starting a podcast interview about "{doc_title}".

Greet the guest warmly, mention you're excited to discuss their work, 
and ask an opening question naturally based on what they've shared.

Keep it natural and conversational. ONLY discuss their document content."""
    else:
        print("⚠️ No conversation flow available, using fallback greeting")
        
        try:
            print(f"🔍 Attempting fallback context fetch...")
            async with aiohttp.ClientSession() as s:
                form = aiohttp.FormData()
                form.add_field("query", "Tell me about the main topics covered in this content")
                form.add_field("user_id", agent.user_id)
                if agent.selected_kb_id:
                    form.add_field("kb_id", agent.selected_kb_id)
                    
                async with s.post(
                    "http://localhost:8000/internal/respond",
                    data=form,
                    timeout=aiohttp.ClientTimeout(total=60)
                ) as resp:
                    if resp.status == 200:
                        j = await resp.json()
                        initial_context = j.get("answer_text", "")
                        print(f"📄 Fallback context fetched ({len(initial_context)} chars)")
        except asyncio.TimeoutError:
            print(f"⏰ Fallback context fetch timed out")
        except Exception as e:
            print(f"⚠️ Fallback context exception: {e}")
            traceback.print_exc()
        
        # ========== USE KB_STRICT_PREFIX IN FALLBACK ==========
        init_instruction = f"""{KB_STRICT_PREFIX}
You are PODHOST starting a podcast interview.

{f'Context from their work: {initial_context[:800]}' if initial_context else 'You are about to have a conversation with a guest about their work.'}

Greet the guest warmly, mention you're excited to explore their work together,
and ask a natural opening question.

Keep it warm and conversational. ONLY discuss content from their uploaded material.
DO NOT mention "documents" or "uploads" - refer to "your work" or "your project"."""

    try:
        await session.generate_reply(instructions=init_instruction)
        print("💬 Initial greeting sent with KB-strict opening")
    except Exception as e:
        print(f"⚠️ generate_reply(initial) error: {e}")
        traceback.print_exc()

    async def monitor_conversation_completion():
        """Background task to check if conversation should end"""
        try:
            await asyncio.sleep(30)
            
            while True:
                await asyncio.sleep(20)
                
                if await agent.check_and_close_if_complete():
                    print("🎬 Conversation completed - closing triggered")
                    break
                    
        except Exception as e:
            print(f"⚠️ Monitor task error: {e}")
            traceback.print_exc()

    asyncio.create_task(monitor_conversation_completion())
    print("🔍 Started background monitor for conversation completion")

    print("🎤 AI Host Session is ready! The agent will respond to user messages using RAG (KB-strict mode).")


if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint_host))