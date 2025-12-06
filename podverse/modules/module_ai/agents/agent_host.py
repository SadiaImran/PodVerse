from dotenv import load_dotenv
import aiohttp
import asyncio
import traceback
import json
from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions
from livekit.agents.llm import function_tool
from livekit.plugins import noise_cancellation, google
import os 

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
        # Log voice configuration
        if voice_name:
            print(f"🎤 Initializing HostAgent with voice: {voice_name}")
        else:
            print(f"🎤 Initializing HostAgent with default voice (None)")
        
        # Ensure voice_name is properly formatted for Gemini API
        # Gemini Realtime expects exact voice names (case-sensitive)
        formatted_voice = voice_name.strip() if voice_name else None
        
        # Configure RealtimeModel for TRUE realtime - respond immediately to audio chunks
        # No waiting for sentence completion - process audio in realtime
        llm_model = google.beta.realtime.RealtimeModel(
            model="models/gemini-2.0-flash-exp",
            temperature=0.8,
            voice=formatted_voice,  # Use provided voice name exactly as passed
        )
        
        # CRITICAL: Configure for immediate realtime response
        # The RealtimeModel processes audio chunks in realtime and responds immediately
        # It does NOT wait for complete sentences or transcript completion
        # Response happens as soon as audio is detected and processed
        
        # Verify voice was set correctly
        if hasattr(llm_model, 'voice'):
            actual_voice = getattr(llm_model, 'voice', None)
            print(f"✅ LLM model voice attribute set to: {actual_voice}")
            if formatted_voice and actual_voice != formatted_voice:
                print(f"⚠️ WARNING: Voice mismatch! Requested: '{formatted_voice}', Actual: '{actual_voice}'")
        else:
            print(f"⚠️ LLM model does not have 'voice' attribute")

        api_google = os.environ.get('GOOGLE_API_KEY')
        
        print(f"The value of API_KEY is: {api_google}")

        super().__init__(
            instructions=AGENT_INSTRUCTION + "\n\nIMPORTANT: Always respond in English only.\n\n**VOICE INSTRUCTION: Use a professional, informative voice tone that matches a podcast host personality.**",
            llm=llm_model,
            tools=[],
        )
        
        # Store voice_name for later reference
        self.voice_name = voice_name

        self.user_id = "default-user"
        self.selected_kb_id = None  
        self._room = None
        self._paused = False
        self._session = None
        
        # Podcast configuration variables (passed from frontend)
        self.podcast_title = None
        self.podcast_description = None
        self.podcast_tags = None
        self.host_name = None
        self.host_tone = None

        # Conversation flow tracking
        self.conversation_flow = None 
        self.current_topic_index = 0   
        self.questions_asked = set()  
        self.topics_covered = set()
        self._closing_triggered = False
    
    def build_instructions_from_variables(self):
        """Build instructions using stored variables instead of string interpolation"""
        base_instruction = AGENT_INSTRUCTION
        
        # Build context from variables with detailed guidance
        context_parts = []
        
        # Podcast topic/title
        if self.podcast_title:
            context_parts.append(f"""**PODCAST TOPIC:**
- You are hosting a podcast about: '{self.podcast_title}'
- Use this topic to guide the conversation naturally while staying within the knowledge base content
- Frame your questions around this topic when relevant""")
        
        # Podcast description for additional context
        if self.podcast_description:
            context_parts.append(f"""**PODCAST CONTEXT:**
- Additional context about this podcast: {self.podcast_description}
- Use this information to better understand the podcast's purpose and direction""")
        
        # Podcast tags for categorization
        if self.podcast_tags and isinstance(self.podcast_tags, list) and len(self.podcast_tags) > 0:
            tags_str = ', '.join(self.podcast_tags)
            context_parts.append(f"""**PODCAST CATEGORIES:**
- This podcast is categorized with tags: {tags_str}
- Keep these categories in mind when structuring the conversation and asking questions""")
        
        if self.host_name:
            context_parts.append(f"""**YOUR NAME:**
- Your name is {self.host_name}
- Introduce yourself using this name in your opening: "Welcome! I'm {self.host_name}, your AI host for today..."
- Refer to yourself by this name when appropriate throughout the conversation""")
        
        if self.host_tone:
            tone_instructions = {
                "formal": "Use a formal, professional tone. Be respectful and maintain a structured conversation style. Address the guest formally and maintain professional boundaries.",
                "casual": "Use a casual, friendly tone. Be relaxed and conversational, like talking to a friend. Keep the atmosphere light and informal.",
                "friendly": "Use a warm, friendly tone. Be approachable and enthusiastic, making the guest feel comfortable. Show genuine interest and warmth.",
                "professional": "Use a professional, polished tone. Be articulate and maintain a business-like demeanor. Keep the conversation focused and structured."
            }
            tone_desc = tone_instructions.get(self.host_tone.lower(), f"Use a {self.host_tone} tone throughout the conversation.")
            context_parts.append(f"""**COMMUNICATION TONE:**
- {tone_desc}
- Maintain this tone consistently throughout the entire conversation
- Let your tone reflect your personality as the host""")
        
        if context_parts:
            return base_instruction + "\n\n" + "\n\n".join(context_parts) + "\n\nIMPORTANT: Always respond in English only."
        
        return base_instruction + "\n\nIMPORTANT: Always respond in English only."

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

    await ctx.connect()
    room = ctx.room

    print(f"🏠 Connected to room: {getattr(room, 'name', 'unknown')}")
    await asyncio.sleep(0.6)

    room_name_str = getattr(room, 'name', 'my-room')
    print(f"🎬 Starting recording immediately when room connects...")
    
    # Start recording immediately when room connects (before participant connects)
    # This ensures we capture the first dialogue from the host
    try:
        # Extract user_id and kb_id from room metadata or wait for participant
        # For now, start with default values - will be updated when participant connects
        print(f"🎬 Starting audio egress immediately for room: {room_name_str}")
        asyncio.create_task(trigger_audio_egress(room_name_str, None, None))
    except Exception as e:
        print(f"⚠️ Error starting immediate recording: {e}")
    
    # Extract voice_name from existing participants before creating agent
    voice_name = None
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
        
        print(f"🔍 Checking {len(participants)} existing participants for voice_name...")
        for p in participants:
            try:
                if getattr(p, "identity", None) and not p.identity.startswith("agent"):
                    meta = getattr(p, "metadata", None)
                    if meta:
                        try:
                            parsed = json.loads(meta)
                            if "voice_name" in parsed:
                                voice_name = parsed["voice_name"]
                                print(f"🎤 Found voice_name from participant metadata: {voice_name}")
                                break
                        except Exception as e:
                            print(f"⚠️ Metadata parse error: {e}")
            except Exception:
                continue
    except Exception as e:
        print(f"⚠️ Error extracting voice_name: {e}")
    
    # Create agent with voice_name if available
    session = AgentSession()
    agent = HostAgent(voice_name=voice_name)
    if voice_name:
        print(f"🎤 HostAgent created with voice: {voice_name}")
    agent._session = session
    agent._room = room

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
                        # Extract host persona (name, tone) from metadata - store as variables
                        if "host_persona" in parsed:
                            host_persona = parsed["host_persona"]
                            agent.host_name = host_persona.get("name")
                            agent.host_tone = host_persona.get("tone", "casual")
                            print(f"🎙️ Host persona from metadata: name={agent.host_name}, tone={agent.host_tone}")
                        
                        # Extract podcast configuration from metadata - store as variables
                        if "podcast_title" in parsed:
                            agent.podcast_title = parsed["podcast_title"]
                            print(f"📝 Podcast title from metadata: {agent.podcast_title}")
                        
                        if "podcast_description" in parsed:
                            agent.podcast_description = parsed["podcast_description"]
                            print(f"📄 Podcast description from metadata: {agent.podcast_description[:100]}...")
                        
                        if "podcast_tags" in parsed:
                            agent.podcast_tags = parsed["podcast_tags"]
                            print(f"🏷️ Podcast tags from metadata: {agent.podcast_tags}")
                        
                        # Rebuild instructions using variables (safer approach)
                        if agent.host_name or agent.host_tone or agent.podcast_title or agent.podcast_description or agent.podcast_tags:
                            updated_instructions = agent.build_instructions_from_variables()
                            if hasattr(agent, '_instructions'):
                                agent._instructions = updated_instructions
                            else:
                                # Update base instructions if _instructions doesn't exist
                                agent.instructions = updated_instructions
                            print(f"✅ Rebuilt agent instructions using variables")
                        # Update voice if provided in metadata
                        if "voice_name" in parsed:
                            new_voice = parsed["voice_name"].strip() if parsed["voice_name"] else None
                            if new_voice:
                                # Try to update voice on existing model
                                if hasattr(agent, '_llm') and hasattr(agent._llm, 'voice'):
                                    try:
                                        agent._llm.voice = new_voice
                                        actual_voice = getattr(agent._llm, 'voice', None)
                                        print(f"🎤 Voice updated to: {new_voice}")
                                        if actual_voice != new_voice:
                                            print(f"⚠️ WARNING: Voice update mismatch! Requested: '{new_voice}', Actual: '{actual_voice}'")
                                    except Exception as e:
                                        print(f"⚠️ Could not update voice: {e}")
                                else:
                                    # If voice can't be updated, log it
                                    print(f"⚠️ Cannot update voice - model doesn't support voice attribute. Requested: {new_voice}")
                        print(f"✅ user_id from metadata: {agent.user_id}, kb_id: {agent.selected_kb_id}, podcast_title: {agent.podcast_title}")
                        
                        # Recording already started when room connected (to capture first dialogue)
                        # No need to start again here
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
                            print(f"🔍 Checking participant {getattr(p, 'identity', 'unknown')} metadata: {parsed}")
                            if "userId" in parsed:
                                agent.user_id = parsed["userId"]
                            if "selectedKbId" in parsed:
                                agent.selected_kb_id = parsed["selectedKbId"]
                            # Extract host persona (name, tone) from metadata - store as variables
                            if "host_persona" in parsed:
                                host_persona = parsed["host_persona"]
                                agent.host_name = host_persona.get("name")
                                agent.host_tone = host_persona.get("tone", "casual")
                                print(f"🎙️ Host persona from metadata: name={agent.host_name}, tone={agent.host_tone}")
                            
                            # Extract podcast configuration from metadata - store as variables
                            if "podcast_title" in parsed:
                                agent.podcast_title = parsed["podcast_title"]
                                print(f"📝 Podcast title from metadata: {agent.podcast_title}")
                            
                            if "podcast_description" in parsed:
                                agent.podcast_description = parsed["podcast_description"]
                                print(f"📄 Podcast description from metadata: {agent.podcast_description[:100]}...")
                            
                            if "podcast_tags" in parsed:
                                agent.podcast_tags = parsed["podcast_tags"]
                                print(f"🏷️ Podcast tags from metadata: {agent.podcast_tags}")
                            
                            # Rebuild instructions using variables (safer approach)
                            if agent.host_name or agent.host_tone or agent.podcast_title or agent.podcast_description or agent.podcast_tags:
                                updated_instructions = agent.build_instructions_from_variables()
                                if hasattr(agent, '_instructions'):
                                    agent._instructions = updated_instructions
                                else:
                                    # Update base instructions if _instructions doesn't exist
                                    agent.instructions = updated_instructions
                                print(f"✅ Rebuilt agent instructions using variables")
                            # Verify voice matches
                            if "voice_name" in parsed:
                                extracted_voice = parsed["voice_name"]
                                if extracted_voice != voice_name:
                                    print(f"⚠️ Voice mismatch: extracted={extracted_voice}, agent={voice_name}")
                                else:
                                    print(f"✅ Voice confirmed: {extracted_voice}")
                            
                            # Start audio egress recording if participant already connected at startup
                            if room_name_str and agent.user_id != "default-user" and agent.selected_kb_id:
                                print(f"🎬 Starting audio egress recording for room: {room_name_str} (startup participant)")
                                asyncio.create_task(trigger_audio_egress(room_name_str, agent.user_id, agent.selected_kb_id))
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

    print(f"🧩 Final user_id: {agent.user_id}, selected_kb_id: {agent.selected_kb_id}, voice: {voice_name}")

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
        # Configure RoomInputOptions for TRUE realtime - no delays, immediate response
        # The agent will respond to audio chunks immediately, not waiting for transcript
        await session.start(
            room=room,
            agent=agent,
            room_input_options=RoomInputOptions(
                video_enabled=False,
                noise_cancellation=noise_cancellation.BVC(),
                # Realtime mode: process audio chunks immediately, respond as soon as speech is detected
                # No waiting for sentence completion or transcript generation
            ),
        )
        print("🎤 AI Host Session Started Successfully!")
        print(f"📝 Transcript will be automatically generated by egress")
        print(f"⚡ REALTIME MODE: Agent responds immediately to audio chunks - no waiting for transcript completion")
        
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

Context from the uploaded material:
{initial_context[:1000] if initial_context else "Opening the conversation..."}

Your opening MUST follow this structure:
1. Greet the guest warmly and introduce yourself (e.g., "Welcome! I'm [Name]...")
2. Briefly mention the exciting topic you'll be exploring today ("{doc_title}")
3. Give a short, intriguing teaser based on the context above (1 sentence)
4. Transition smoothly into this first question: "{first_question}"

CRITICAL STYLE RULES:
- Sound like a professional yet warm podcast host.
- NEVER use the words "document", "file", "pdf", "upload", or "chunks".
- Instead, refer to "your work", "your research", "your project", or "Stackware".
- Do not say "According to..." or "The text states...". Just state the facts naturally.
- Keep the intro under 4 sentences total."""

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