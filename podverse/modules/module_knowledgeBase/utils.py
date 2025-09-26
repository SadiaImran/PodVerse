from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import CharacterTextSplitter
from langchain_core.documents import Document
import speech_recognition as sr
import tempfile
import os
import re
import random
from typing import List, Dict, Optional
from collections import defaultdict, deque
from .config import CHUNK_SIZE, CHUNK_OVERLAP, SMALL_TALK_PATTERNS, MAX_CONVERSATION_TURNS

# ========= DOCUMENT PROCESSING UTILS =========
def parse_pdf_bytes_to_docs(file_bytes: bytes, filename: str) -> List[Document]:
    """Extract text from PDF bytes into LangChain Documents."""
    docs: List[Document] = []
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name
    
    try:
        try:
            from PyPDF2 import PdfReader
            reader = PdfReader(tmp_path)
            for pnum, page in enumerate(reader.pages):
                text = page.extract_text() or ""
                if text.strip():
                    docs.append(Document(
                        page_content=text,
                        metadata={"source": filename, "page": pnum + 1},
                    ))
        except Exception:
            loader = PyPDFLoader(tmp_path)
            docs = loader.load()
    finally:
        try:
            os.remove(tmp_path)
        except Exception:
            pass
    return docs

def chunk_docs(docs: List[Document]) -> List[Document]:
    """Split documents into chunks"""
    splitter = CharacterTextSplitter(chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP)
    return splitter.split_documents(docs)

# ========= TEXT PROCESSING UTILS =========
def detect_small_talk(text: str) -> Optional[str]:
    """Detect and respond to small talk"""
    q = text.lower().strip()
    for pattern, reply in SMALL_TALK_PATTERNS.items():
        if re.search(pattern, q):
            return reply
    return None

def extract_last_question(text: str) -> Optional[str]:
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

# ========= CONVERSATION UTILS =========
# Global conversation state
conversation_state = defaultdict(lambda: deque(maxlen=MAX_CONVERSATION_TURNS))

def format_chat_history(turns: List[Dict[str, str]]) -> str:
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

# ========= PODCAST ENHANCEMENT UTILS =========
def make_response_natural(answer: str, persona: str) -> str:
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
        
        # Add ONE question
        if question_sentences:
            question = question_sentences[0].strip()
            if not question.endswith('?'):
                question += '?'
            answer += " " + question
        else:
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

def generate_host_opening(context: str, show_name: str, guest_name: str) -> str:
    """Generate an engaging opening for the host - with only ONE question"""
    if not context:
        return f"Welcome to {show_name}! I'm excited to dive into some fascinating topics with you today. What should we start exploring?"
    
    # Extract interesting concepts from context
    interesting_topics = []
    sentences = context.split('.')
    
    for sentence in sentences[:8]:
        sentence = sentence.strip()
        if len(sentence) > 30 and not sentence.lower().startswith(('the', 'this', 'that', 'it', 'from')):
            if sentence:
                interesting_topics.append(sentence)
    
    if interesting_topics:
        best_topic = max(interesting_topics, key=len)
        
        opening_templates = [
            f"Welcome to {show_name}! I'm here with {guest_name}, and we're diving into some really compelling material today. I'm particularly curious about {best_topic.lower()}. What's your perspective on this?",
            f"Hey everyone, welcome to {show_name}! {guest_name} is here with me, and we've got some fascinating territory to explore. One thing that caught my attention was {best_topic.lower()}. Can you walk us through your thoughts?",
            f"Welcome to the show! I'm excited to have {guest_name} here today because we're going to unpack some really interesting ideas. I keep thinking about {best_topic.lower()}. How do you see this?"
        ]
        
        return random.choice(opening_templates)
    
    return f"Welcome to {show_name}, {guest_name}! I'm really excited to explore these fascinating topics with you today. Where should we start?"

# ========= AUDIO PROCESSING UTILS =========
def transcribe_audio(audio_file_path: str) -> str:
    """Transcribe audio file to text"""
    recognizer = sr.Recognizer()
    
    try:
        with sr.AudioFile(audio_file_path) as source:
            audio_data = recognizer.record(source)
            return recognizer.recognize_google(audio_data)
    except sr.UnknownValueError:
        return "[No speech detected]"
    except Exception as e:
        print(f"Audio transcription error: {e}")
        return "[Error processing audio]"