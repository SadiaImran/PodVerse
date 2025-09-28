import base64
import os
from gradio_client import Client as GradioClient

# ========= TTS CONFIGURATION =========
PERSONA_TO_VOICE = {"host": "m-us-1", "guest": "f-us-1"}

# ========= TTS FUNCTIONS =========
_tts_client = None

def get_tts_client():
    """Get TTS client singleton"""
    global _tts_client
    if _tts_client is None:
        _tts_client = GradioClient(
            "https://sadiaimran-styletts2-f1.hf.space/",
            hf_token=os.environ.get("HF_TOKEN", ""),
        )
    return _tts_client

def generate_tts_audio(text: str, voice: str = "f-us-1", steps: int = 3):
    """Generate TTS audio using HuggingFace Space and return base64"""
    try:
        tts_client = get_tts_client()
        result_path = tts_client.predict(text, voice, steps, api_name="/synthesize")
        
        with open(result_path, "rb") as audio_file:
            audio_bytes = audio_file.read()
        
        try:
            if os.path.exists(result_path):
                os.remove(result_path)
        except Exception:
            pass
        
        return base64.b64encode(audio_bytes).decode("utf-8")
    except Exception as e:
        print(f"TTS generation failed: {e}")
        return None