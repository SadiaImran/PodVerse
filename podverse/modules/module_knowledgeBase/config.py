import os
import re
from typing import Dict

# ========= API CONFIGURATION =========
TOGETHER_API_KEY = os.environ.get(
    "TOGETHER_API_KEY", 
    "f98103d1acc08e8528e75028deee01807c69312f742eaddbd877d1b87123dffb"
)
HF_TOKEN = os.environ.get("HF_TOKEN", "")

# ========= MODEL CONFIGURATION =========
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
LLM_MODEL = "mistralai/Mistral-7B-Instruct-v0.1"
LLM_BASE_URL = "https://api.together.xyz/v1"

# ========= DOCUMENT PROCESSING =========
CHUNK_SIZE = 500
CHUNK_OVERLAP = 100

# ========= PODCAST CONFIGURATION =========
DEFAULT_AI_PERSONA = "guest"
PERSONA_TO_VOICE = {"host": "m-us-1", "guest": "f-us-1"}

# ========= TTS CONFIGURATION =========
TTS_GRADIO_URL = "https://sadiaimran-styletts2-f1.hf.space/"

# ========= CONVERSATION LIMITS =========
MAX_CONVERSATION_TURNS = 24
MAX_RECENT_TURNS = 14

# ========= SMALL TALK PATTERNS =========
SMALL_TALK_PATTERNS: Dict[str, str] = {
    r"^\s*(hi|hello|hey)(?:\s+how\s+are\s+you)?\b": "Hi there! Thanks for having me on the show, I'm doing fantastic! How about you?",
    r"\b(thank(s)?|thank you|appreciate it)\b": "You're so welcome! I'm thrilled to be here and excited about our chat!",
    r"\b(bye|goodbye|see ya|see you)\b": "Thank you for having me! This was absolutely wonderful, take care!",
}