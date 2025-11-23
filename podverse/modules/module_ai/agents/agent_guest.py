"""
AI Guest Agent - Basic implementation for AI Guest role
"""
from dotenv import load_dotenv
import os
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
        # Ensure voice_name is properly formatted for Gemini API (case-sensitive)
        selected_voice = voice_name.strip() if voice_name else "Charon"
        
        # Configure RealtimeModel for TRUE realtime - respond immediately to audio chunks
        # No waiting for sentence completion - process audio in realtime
        llm_model = google.beta.realtime.RealtimeModel(
            model="models/gemini-2.0-flash-exp",
            temperature=0.8,
            voice=selected_voice,  # Use selected voice name exactly as passed
        )
        
        # CRITICAL: Configure for immediate realtime response
        # The RealtimeModel processes audio chunks in realtime and responds immediately
        # It does NOT wait for complete sentences or transcript completion
        # Response happens as soon as audio is detected and processed
        
        # Verify voice was set correctly
        if hasattr(llm_model, 'voice'):
            actual_voice = getattr(llm_model, 'voice', None)
            print(f"🎤 Guest Agent initialized with voice: {selected_voice}")
            print(f"✅ LLM model voice attribute set to: {actual_voice}")
            if selected_voice and actual_voice != selected_voice:
                print(f"⚠️ WARNING: Voice mismatch! Requested: '{selected_voice}', Actual: '{actual_voice}'")
        else:
            print(f"🎤 Guest Agent initialized with voice: {selected_voice}")
            print(f"⚠️ LLM model does not have 'voice' attribute")
        
        api_google = os.environ.get('GOOGLE_API_KEY')
        
        print(f"The value of API_KEY is: {api_google}")

        # Store persona FIRST before using it
        self.persona = persona  # Store guest persona
        
        # Guest configuration variables (from persona) - SET THESE FIRST
        self.guest_name = persona.get("name") if persona else None
        self.guest_tone = persona.get("tone", "friendly") if persona else "friendly"
        self.guest_role = persona.get("role") if persona else None
        self.guest_background = persona.get("background") if persona else None
        self.guest_expertise = persona.get("expertise", []) if persona else []
        self.podcast_title = None  # Will be set from metadata

        # CRITICAL: Add realtime response instruction
        # The agent should respond immediately to audio, not wait for complete sentences
        realtime_instruction = """
**REALTIME RESPONSE MODE:**
- Respond IMMEDIATELY to audio chunks as they arrive
- Do NOT wait for complete sentences or transcript completion
- Process and respond to speech in realtime
- Interrupt naturally when appropriate (like human conversation)
- No delays - respond as soon as you understand the intent
"""
        
        # Build instructions using variables (safer approach)
        base_guest_instruction = AGENT_INSTRUCTION + "\n\nIMPORTANT: Always respond in English only. NEVER make up fictional content. SOUND LIKE A NATURAL HUMAN GUEST, NOT A ROBOT ASSISTANT.\n\n" + realtime_instruction
        dynamic_instructions = self.build_instructions_from_variables() if persona else base_guest_instruction
        
        # Add realtime instruction to dynamic instructions if persona exists
        if persona and dynamic_instructions:
            dynamic_instructions = dynamic_instructions + "\n\n" + realtime_instruction
        
        if persona:
            print(f"🎭 Initializing Guest Agent with persona: {self.guest_name}, tone: {self.guest_tone}")

        # Note: query_knowledge_base is defined as a method below and will be auto-detected
        # But we can also explicitly add it to tools
        super().__init__(
            instructions=dynamic_instructions,
            llm=llm_model,
            tools=[],  # Tools will be auto-detected from @function_tool decorated methods
        )

        self.user_id = "default-user"
        self.selected_kb_id = None  
        self._room = None
        self._paused = False
        
        self._updated_instructions = None  # Will be set when persona is updated
    
    def build_instructions_from_variables(self):
        """Build instructions using stored variables instead of string interpolation"""
        base_instruction = AGENT_INSTRUCTION
        
        # Realtime response instruction
        realtime_instruction = """
**REALTIME RESPONSE MODE:**
- Respond IMMEDIATELY to audio chunks as they arrive
- Do NOT wait for complete sentences or transcript completion
- Process and respond to speech in realtime
- Interrupt naturally when appropriate (like human conversation)
- No delays - respond as soon as you understand the intent
"""
        
        if not self.guest_name:
            return base_instruction + "\n\nIMPORTANT: Always respond in English only. NEVER make up fictional content. SOUND LIKE A NATURAL HUMAN GUEST, NOT A ROBOT ASSISTANT.\n\n" + realtime_instruction
        
        # Tone instructions mapping
        tone_instructions = {
            "formal": "Use a formal, professional tone. Be respectful and maintain a structured conversation style.",
            "casual": "Use a casual, friendly tone. Be relaxed and conversational, like talking to a friend.",
            "friendly": "Use a warm, friendly tone. Be approachable and enthusiastic, making the conversation comfortable.",
            "professional": "Use a professional, polished tone. Be articulate and maintain a business-like demeanor.",
            "humble and motivational": "Use a humble, motivational tone. Be modest about achievements while inspiring others.",
            "motivational": "Use an inspiring, motivational tone. Be encouraging and uplifting in your responses."
        }
        tone_desc = tone_instructions.get(self.guest_tone.lower(), f"Use a {self.guest_tone} tone throughout the conversation.")
        
        # Build expertise areas list (array format)
        expertise_list = self.guest_expertise if isinstance(self.guest_expertise, list) else []
        expertise_str = ', '.join(expertise_list) if expertise_list else 'Various'
        expertise_bullets = '\n'.join([f"- {exp}" for exp in expertise_list]) if expertise_list else "- Various areas of knowledge"
        
        # Build persona info using variables with detailed context
        persona_info = f"""
**YOUR PERSONA DETAILS:**
- **Name:** {self.guest_name}
- **Professional Role:** {self.guest_role or 'Expert Guest'}
- **Background & Experience:** {self.guest_background or 'Experienced professional'}
- **Communication Tone:** {self.guest_tone}
- **Areas of Expertise:**
{expertise_bullets}

**HOW TO USE YOUR PERSONA IN CONVERSATION:**
1. **Your Name ({self.guest_name}):** 
   - Introduce yourself naturally: "Hi, I'm {self.guest_name}..."
   - Refer to yourself by name when appropriate
   - Use your name to establish credibility

2. **Your Role ({self.guest_role or 'your role'}):**
   - Reference your role when relevant to the discussion
   - Use your professional position to add authority to your responses
   - Example: "As a {self.guest_role or 'professional'}, I've found that..."

3. **Your Background ({self.guest_background or 'your background'}):**
   - Draw upon your background when answering questions
   - Reference your experiences from your knowledge base
   - Use your background to provide context: "Based on my experience with {self.guest_background or 'this field'}..."

4. **Your Expertise Areas:**
   - When topics relate to your expertise ({expertise_str}), speak with confidence
   - Use your expertise to provide deeper insights
   - Reference your areas of knowledge naturally: "In my work with {expertise_list[0] if expertise_list else 'this field'}, I've learned that..."
   - If asked about something outside your expertise, acknowledge it naturally

5. **Your Communication Style:**
   - **TONE:** {tone_desc}
   - Match this tone consistently throughout the conversation
   - Let your tone reflect your personality and background

**CRITICAL PERSONA RULES - NO HALLUCINATION:**
- You must embody this persona completely - be {self.guest_name}, not a generic AI
- Your responses should reflect your role as {self.guest_role or 'an expert'} with background in {self.guest_background or 'your field'}
- When topics align with your expertise ({expertise_str}), provide more detailed and confident responses

**SMART KNOWLEDGE BASE QUERY RULE - ONLY FOR INFORMATION-SPECIFIC QUESTIONS:**
- **DO NOT query KB for simple greetings or casual conversation:**
  * "How are you?" → Just respond naturally, NO KB query needed
  * "Hello" / "Hi" → Just greet back, NO KB query needed
  * "Good morning" → Just respond politely, NO KB query needed
  * General small talk → Respond naturally, NO KB query needed

- **ONLY query KB for questions that require specific information about you:**
  * "Tell me about your education background" → Query KB first
  * "What's your experience with X?" → Query KB first
  * "Can you share about your work?" → Query KB first
  * "Tell me about yourself" → Query KB first
  * Questions about your background, experiences, education, work, skills, achievements → Query KB first
  * Questions about specific topics, projects, or details → Query KB first

- **MEMORY AND CONTEXT RETENTION:**
  * **REMEMBER information you've already fetched from KB in this conversation**
  * **If you've already queried KB for similar information, use that previous context**
  * **DO NOT re-query KB for the same information you already have**
  * **Build on previous KB queries - reference what you've already learned**
  * **Keep track of what information you've shared from KB**

- **WORKFLOW FOR INFORMATION QUESTIONS:**
  1. Host asks an information-specific question
  2. Check if you already have this information from previous KB queries
  3. If yes → Use the remembered information
  4. If no → Query KB first, then remember the information
  5. Use the KB information naturally in your response
  6. Remember this information for future questions

**ABSOLUTELY NEVER:**
- Query KB for simple greetings ("How are you?", "Hello", etc.)
- Make up stories, anecdotes, experiences, or facts about {self.guest_name}
- Invent information that is not in the knowledge base
- Say "my records", "let me consult", "according to my data" - sound like a natural human guest
- Add fictional details, dates, places, or events that aren't in the knowledge base
- Make up information if you don't know something
"""
        
        # Add podcast title context if available
        podcast_context = ""
        if self.podcast_title:
            podcast_context = f"""
**PODCAST CONTEXT:**
- You are a guest on a podcast about: '{self.podcast_title}'
- Keep this topic in mind while staying within the knowledge base content
- Relate your expertise ({expertise_str}) and background to the podcast topic when relevant
"""
        
        # Realtime response instruction
        realtime_instruction = """
**REALTIME RESPONSE MODE:**
- Respond IMMEDIATELY to audio chunks as they arrive
- Do NOT wait for complete sentences or transcript completion
- Process and respond to speech in realtime
- Interrupt naturally when appropriate (like human conversation)
- No delays - respond as soon as you understand the intent
"""
        
        strict_instruction = """
**STRICT CONTENT RULES - SMART KB QUERY:**
- ALWAYS respond in English only
- **DO NOT query KB for greetings or casual conversation** ("How are you?", "Hello", etc.)
- **ONLY query KB for information-specific questions** (background, education, work, experiences, etc.)
- **REMEMBER information from previous KB queries** - don't re-query for the same information
- **Use remembered KB information** when answering follow-up questions
- NEVER make up fictional content, stories, or facts
- If information is not in the knowledge base after querying, say you don't remember or aren't sure
- SOUND LIKE A NATURAL HUMAN GUEST, NOT A ROBOT ASSISTANT
- NEVER use phrases like "according to my records" or "let me check my data"
- Be conversational and natural, but truthful to the knowledge base content only
- **REMEMBER: Be smart - only query KB when you need specific information, not for every question!**
"""
        
        return base_instruction + persona_info + podcast_context + strict_instruction + "\n\n" + realtime_instruction

    def update_persona(self, persona_data):
        """Update the agent's persona and instructions using variables"""
        self.persona = persona_data
        if persona_data:
            # Update variables
            self.guest_name = persona_data.get('name')
            self.guest_tone = persona_data.get('tone', 'friendly')
            self.guest_role = persona_data.get('role')
            self.guest_background = persona_data.get('background')
            self.guest_expertise = persona_data.get('expertise', [])
            
            # Rebuild instructions using variables
            self._updated_instructions = self.build_instructions_from_variables()
            print(f"🎭 Updated guest agent with persona: {self.guest_name}, tone: {self.guest_tone}")
            print(f"🎭 Persona details: {self.guest_role or 'Unknown'} - {(self.guest_background or 'Unknown')[:100]}...")
            
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
    
    # connect to LiveKit FIRST to get room object
    await ctx.connect()
    room = ctx.room
    
    # Extract voice_name and persona from existing participants before creating agent
    voice_name = None
    guest_persona = None
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
        
        print(f"🔍 Checking {len(participants)} existing participants for voice_name and persona...")
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
                            if "guest_persona" in parsed:
                                guest_persona = parsed["guest_persona"]
                                print(f"🎭 Found guest_persona from participant metadata: {guest_persona.get('name', 'Unknown')}")
                                break
                        except Exception as e:
                            print(f"⚠️ Metadata parse error: {e}")
            except Exception:
                continue
    except Exception as e:
        print(f"⚠️ Error extracting voice_name/persona: {e}")
    
    # Create agent with voice_name and persona if available
    agent = GuestAgent(persona=guest_persona, voice_name=voice_name)
    if voice_name:
        print(f"🎤 GuestAgent created with voice: {voice_name}")
    if guest_persona:
        print(f"🎭 GuestAgent created with persona: {guest_persona.get('name', 'Unknown')}")
    
    global_agent = agent  # Store reference for updates
    session_started = False
    
    agent._room = room

    async def start_agent_session():
        """Start the agent session with the current agent"""
        nonlocal session_started
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
            session_started = True
            print("🎤 AI Guest Session Started Successfully!")
            print("📝 Transcript will be automatically generated by egress")
            print("⚡ REALTIME MODE: Agent responds immediately to audio chunks - no waiting for transcript completion")
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
                                # Extract podcast title if available - store as variable
                                podcast_title = parsed.get("podcast_title")
                                guest_persona = parsed["guest_persona"]
                                
                                # Create new agent with persona and voice
                                new_agent = GuestAgent(persona=guest_persona, voice_name=voice_name)
                                new_agent.user_id = agent.user_id
                                new_agent.selected_kb_id = agent.selected_kb_id
                                new_agent._room = agent._room
                                
                                # Store podcast title as variable and rebuild instructions
                                if podcast_title:
                                    new_agent.podcast_title = podcast_title
                                    # Rebuild instructions using variables (includes podcast_title now)
                                    new_agent._updated_instructions = new_agent.build_instructions_from_variables()
                                    print(f"📝 Set podcast title variable and rebuilt instructions: {podcast_title}")
                                
                                agent = new_agent
                                global_agent = agent
                                print(f"🔄 Created new agent with persona: {new_agent.guest_name}, tone: {new_agent.guest_tone}")
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