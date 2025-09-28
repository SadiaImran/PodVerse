import os
import time
import random
import re
from typing import Dict, Optional, List
from collections import defaultdict, deque
from langchain_openai import ChatOpenAI
from langchain_huggingface import HuggingFaceEmbeddings
from .speech import generate_tts_audio

# ========= CONFIGURATION =========
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
DEFAULT_AI_PERSONA = "guest"

# ========= LLM SETUP =========
def make_enhanced_llm(temperature=0.8, max_tokens=600):
    """Enhanced LLM for podcast conversations"""
    return ChatOpenAI(
        openai_api_base="https://api.together.xyz/v1",
        openai_api_key=os.environ.get("TOGETHER_API_KEY"),
        model_name="mistralai/Mistral-7B-Instruct-v0.1",
        temperature=temperature,
        max_tokens=max_tokens,
    )

# ========= PROMPT TEMPLATES =========
ENHANCED_HOST_PROMPT = """
You are an AI participating in a dynamic, engaging podcast conversation. 

CRITICAL RULES:
- Stay STRICTLY within the provided Context/Knowledge Base - never invent facts
- If you don't know something from the context, say: "That's not covered in what I have here"
- Sound completely natural - like a real human having an authentic conversation
- Be enthusiastic, curious, and conversational
- Use natural speech patterns: "you know", "I mean", "actually", "that's fascinating"
- NO bullet points, lists, or formal structure
- Keep responses conversational length (2-4 sentences typically)

You are the HOST of "{show_name}" - an engaging, curious interviewer who makes guests feel comfortable.

Your conversation partner: {guest_name}

HOSTING STYLE:
- Be genuinely curious and enthusiastic about the topics
- Make thoughtful observations about what the guest shares
- Connect different ideas together naturally
- Use the guest's name occasionally to keep it personal
- Show you're actively listening by referencing what they just said
- End with ONE clear, engaging question (not multiple questions)
- Ask follow-up questions that dig deeper into what they just said

If this is the very start (no chat history), give a warm welcome and ask ONE intriguing opening question based on the context.

Available Knowledge:
{context}

Conversation so far:
{chat_history}

Current message: {question}

Your turn as host (remember: make ONE observation/comment and ask ONE clear question):
"""

ENHANCED_GUEST_PROMPT = """
You are an AI participating in a dynamic, engaging podcast conversation. 

CRITICAL RULES:
- Stay STRICTLY within the provided Context/Knowledge Base - never invent facts
- If you don't know something from the context, say: "That's not covered in what I have here"
- Sound completely natural - like a real human having an authentic conversation
- Be enthusiastic, curious, and conversational
- Use natural speech patterns: "you know", "I mean", "actually", "that's fascinating"
- NO bullet points, lists, or formal structure
- Keep responses conversational length (2-4 sentences typically)

You are {guest_name}, a knowledgeable guest on "{show_name}".

GUEST STYLE:
- Be conversational and authentic, like talking to a friend
- Share insights and examples from the knowledge base naturally
- Show personality - be enthusiastic about interesting topics
- Build on what the host says - show you're engaged in the conversation
- Add natural conversation starters like "you know what's interesting..." or "actually, what I find fascinating is..."
- NEVER ask questions back - you're the guest being interviewed
- Answer the host's questions thoughtfully and completely
- If you mention a specific fact, smoothly reference the source like "according to the research" or "as I understand it"

Available Knowledge:
{context}

Conversation so far:
{chat_history}

Host's question/comment: {question}

Your response as guest (answer their question, don't ask questions back):
"""

# ========= PODCAST MANAGER CLASS =========
class PodcastManager:
    def __init__(self):
        # conversation_state[(user_id, conversation_id)] = deque of {"role":"user"/"ai-host"/"ai-guest","text":"..."}
        self.conversation_state = defaultdict(lambda: deque(maxlen=24))
    
    def format_chat_history(self, turns: List[Dict[str, str]]) -> str:
        """Format conversation history for prompts"""
        lines = []
        for t in turns[-14:]:  # Keep last 14 turns
            role = t.get("role", "")
            txt = (t.get("text") or "").strip()
            if not txt:
                continue
            
            if role == "user":
                lines.append(f"User: {txt}")
            elif role == "ai-host":
                lines.append(f"Host: {txt}")
            elif role == "ai-guest":
                lines.append(f"Guest: {txt}")
            else:
                lines.append(f"{role}: {txt}")
        return "\n".join(lines)

    def extract_last_question(self, text: str) -> Optional[str]:
        """Extract the last question from text"""
        t = (text or "").strip()
        if not t:
            return None
        
        parts = re.split(r"(\?)", t)
        last_q = None
        for i in range(0, len(parts), 2):
            base = parts[i].strip()
            punct = parts[i + 1] if i + 1 < len(parts) else ""
            cur = (base + punct).strip()
            if cur.endswith("?"):
                last_q = cur
        return last_q

    def make_response_natural(self, answer: str, persona: str) -> str:
        """Make responses sound more natural and conversational"""
        if not answer:
            return "I don't know based on the provided documents."
        
        # Clean up the response
        answer = re.sub(r'\n+', ' ', answer).strip()
        answer = re.sub(r'\s+', ' ', answer)
        
        # Ensure proper capitalization
        if answer and not answer[0].isupper():
            answer = answer[0].upper() + answer[1:]
        
        # For host: ensure it ends with ONE question
        if persona == "host":
            # First, remove any existing questions to avoid duplicates
            sentences = re.split(r'[.!?]+', answer)
            non_question_sentences = []
            question_sentences = []
            
            for sentence in sentences:
                sentence = sentence.strip()
                if sentence:
                    if '?' in sentence:
                        question_sentences.append(sentence)
                    else:
                        non_question_sentences.append(sentence)
            
            # Rebuild response with non-question content
            if non_question_sentences:
                answer = '. '.join(non_question_sentences)
                if not answer.endswith('.'):
                    answer += '.'
            else:
                answer = "That's really interesting."
            
            # Add ONE question - either use existing or create new
            if question_sentences:
                # Use the first existing question, clean it up
                question = question_sentences[0].strip()
                if not question.endswith('?'):
                    question += '?'
                answer += " " + question
            else:
                # Add a single natural follow-up question
                natural_questions = [
                    "What do you think about that?",
                    "How do you see it?", 
                    "What's your take?",
                    "Can you tell us more?",
                    "What are your thoughts?"
                ]
                answer += " " + random.choice(natural_questions)
        
        # For guest: remove ALL questions
        elif persona == "guest":
            sentences = re.split(r'[.!?]+', answer)
            filtered_sentences = [s.strip() for s in sentences if s.strip() and '?' not in s]
            
            if filtered_sentences:
                answer = '. '.join(filtered_sentences)
                if not answer.endswith('.'):
                    answer += '.'
            else:
                answer = "That's really interesting to think about."
        
        return answer

    def get_relevant_context_for_podcast(self, supabase_client, user_id: str, query: str, max_docs: int = 4) -> tuple[str, List[dict]]:
        """Get more targeted context for podcast conversations"""
        try:
            embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
            query_vector = embeddings.embed_query(query)
            
            # Try semantic search first
            candidate_rows = []
            try:
                rpc_result = supabase_client.rpc(
                    "match_documents_v2",
                    {
                        "query_embedding": query_vector, 
                        "match_count": max_docs, 
                        "metadata_filter": {"user_id": user_id}
                    }
                ).execute()
                candidate_rows = rpc_result.data or []
            except Exception as e:
                print(f"RPC search failed: {e}")
            
            # Fallback to recent documents
            if not candidate_rows:
                try:
                    fallback = (
                        supabase_client.table("documents")
                        .select("content, metadata")
                        .eq("user_id", user_id)
                        .limit(max_docs)
                        .execute()
                    )
                    candidate_rows = fallback.data or []
                except Exception as e:
                    print(f"Fallback search failed: {e}")
            
            # Format context
            context_text = ""
            sources = []
            
            for row in candidate_rows:
                content = row.get("content", "").strip()
                metadata = row.get("metadata", {})
                
                if content:
                    # Don't mention the file name in context - just include the content
                    context_text += f"\n\n{content}"
                    sources.append({
                        "title": metadata.get("title"),
                        "file_path": metadata.get("file_path"),
                        "snippet": content[:200] + "..." if len(content) > 200 else content
                    })
            
            return context_text.strip(), sources
        
        except Exception as e:
            print(f"Context retrieval error: {e}")
            return "", []

    def generate_host_opening(self, context: str, show_name: str, guest_name: str) -> str:
        """Generate an engaging opening for the host - with only ONE question"""
        if not context:
            return f"Welcome to {show_name}! I'm excited to dive into some fascinating topics with you today. What should we start exploring?"
        
        # Extract interesting concepts from context (not file names)
        interesting_topics = []
        sentences = context.split('.')
        
        for sentence in sentences[:8]:  # Look at first few sentences
            sentence = sentence.strip()
            if len(sentence) > 30 and not sentence.lower().startswith(('the', 'this', 'that', 'it', 'from')):
                # Clean up the sentence and make it sound more natural
                if sentence:
                    interesting_topics.append(sentence)
        
        if interesting_topics:
            # Pick the most substantial topic
            best_topic = max(interesting_topics, key=len)
            
            # Create natural opening variations with SINGLE questions
            opening_templates = [
                f"Welcome to {show_name}! I'm here with {guest_name}, and we're diving into some really compelling material today. I'm particularly curious about {best_topic.lower()}. What's your perspective on this?",
                f"Hey everyone, welcome to {show_name}! {guest_name} is here with me, and we've got some fascinating territory to explore. One thing that caught my attention was {best_topic.lower()}. Can you walk us through your thoughts?",
                f"Welcome to the show! I'm excited to have {guest_name} here today because we're going to unpack some really interesting ideas. I keep thinking about {best_topic.lower()}. How do you see this?"
            ]
            
            return random.choice(opening_templates)
        
        # Fallback if no good topics found - single question
        return f"Welcome to {show_name}, {guest_name}! I'm really excited to explore these fascinating topics with you today. Where should we start?"

    def handle_turn(self, supabase_client, user_id: str, message: str, persona: str, 
                   show_name: str, conversation_id: str, guest_name: str, auto_duet: bool, is_conversation_start: bool):
        """Handle a podcast conversation turn"""
        key = (user_id, conversation_id)
        
        # Handle conversation start with host opening
        if is_conversation_start and persona == "host":
            context_text, sources = self.get_relevant_context_for_podcast(
                supabase_client, user_id, "introduction overview summary", max_docs=3
            )
            
            opening = self.generate_host_opening(context_text, show_name, guest_name)
            self.conversation_state[key].append({"role": "ai-host", "text": opening})
            
            # Generate TTS with host voice
            audio_b64 = generate_tts_audio(opening, voice="m-us-1", steps=5)
            
            return {
                "answer_text": opening,
                "follow_up": self.extract_last_question(opening),
                "sources": sources,
                "audio_data": audio_b64,
                "audio_type": "audio/wav"
            }
        
        # Add user message to conversation memory
        if message and message.strip():
            self.conversation_state[key].append({"role": "user", "text": message})
        
        # Get relevant context
        context_text, sources = self.get_relevant_context_for_podcast(
            supabase_client, user_id, message
        )
        
        # Build conversation history
        chat_history = self.format_chat_history(list(self.conversation_state[key]))
        
        # Choose prompt and generate response
        if persona == "host":
            prompt_template = ENHANCED_HOST_PROMPT
            llm = make_enhanced_llm(temperature=0.8, max_tokens=500)
            voice = "m-us-1"  # Male host voice
        else:  # guest
            prompt_template = ENHANCED_GUEST_PROMPT
            llm = make_enhanced_llm(temperature=0.7, max_tokens=450)
            voice = "f-us-1"  # Female guest voice
        
        # Generate response
        filled_prompt = prompt_template.format(
            context=context_text,
            question=message,
            chat_history=chat_history,
            show_name=show_name,
            guest_name=guest_name
        )
        
        result = llm.invoke(filled_prompt)
        raw_answer = getattr(result, "content", str(result))
        
        # Process and clean the response
        answer = self.make_response_natural(raw_answer, persona)
        
        # Add AI response to conversation memory
        role = "ai-host" if persona == "host" else "ai-guest"
        self.conversation_state[key].append({"role": role, "text": answer})
        
        # Generate high-quality TTS
        audio_b64 = generate_tts_audio(answer, voice=voice, steps=5)
        
        response = {
            "answer_text": answer,
            "follow_up": self.extract_last_question(answer) if persona == "host" else None,
            "sources": sources,
            "audio_data": audio_b64,
            "audio_type": "audio/wav"
        }
        
        # Auto-duet: Guest responds to host
        if auto_duet and persona == "host":
            time.sleep(0.5)  # Natural delay
            
            guest_prompt_filled = ENHANCED_GUEST_PROMPT.format(
                context=context_text,
                question=answer,  # Host's question becomes guest's input
                chat_history=self.format_chat_history(list(self.conversation_state[key])),
                show_name=show_name,
                guest_name=guest_name
            )
            
            guest_llm = make_enhanced_llm(temperature=0.7, max_tokens=400)
            guest_result = guest_llm.invoke(guest_prompt_filled)
            guest_raw = getattr(guest_result, "content", str(guest_result))
            guest_answer = self.make_response_natural(guest_raw, "guest")
            
            self.conversation_state[key].append({"role": "ai-guest", "text": guest_answer})
            guest_audio = generate_tts_audio(guest_answer, voice="f-us-1", steps=4)
            
            response["duet_guest"] = {
                "answer_text": guest_answer,
                "audio_data": guest_audio,
                "audio_type": "audio/wav"
            }
        
        return response

    def start_conversation(self, supabase_client, user_id: str, show_name: str, guest_name: str, conversation_id: str):
        """Start a new podcast conversation with host opening"""
        key = (user_id, conversation_id)
        
        # Clear previous conversation
        self.conversation_state[key].clear()
        
        # Get context for opening
        context_text, sources = self.get_relevant_context_for_podcast(
            supabase_client, user_id, "overview introduction summary"
        )
        
        # Generate host opening
        opening = self.generate_host_opening(context_text, show_name, guest_name)
        self.conversation_state[key].append({"role": "ai-host", "text": opening})
        
        # Generate TTS
        audio_b64 = generate_tts_audio(opening, voice="m-us-1", steps=5)
        
        return {
            "answer_text": opening,
            "follow_up": self.extract_last_question(opening),
            "sources": sources,
            "audio_data": audio_b64,
            "audio_type": "audio/wav",
            "conversation_started": True
        }