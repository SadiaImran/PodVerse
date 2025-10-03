import base64
import os
import requests
from gradio_client import Client as GradioClient

# ========= TTS CONFIGURATION =========
PERSONA_TO_VOICE = {"host": "m-us-1", "guest": "f-us-1"}

# ========= TTS FUNCTIONS =========
_tts_client = None

def get_tts_client():
    """Get TTS client singleton"""
    global _tts_client
    if _tts_client is None:
        hf_token = os.environ.get("HF_TOKEN", "")
        # Only pass token if it's not empty
        if hf_token and hf_token.strip():
            _tts_client = GradioClient(
                "https://sadiaimran-styletts2-f1.hf.space/",
                hf_token=hf_token,
            )
        else:
            # Use without token for public spaces
            _tts_client = GradioClient(
                "https://sadiaimran-styletts2-f1.hf.space/"
            )
    return _tts_client

def generate_tts_audio(text: str, voice: str = "f-us-1", steps: int = 3):
    """Generate TTS audio using HuggingFace Space and return base64"""
    try:
        print(f"🎤 Generating TTS for: '{text[:50]}...'")
        
        # Try direct HTTP request first (faster)
        try:
            print("🔄 Trying direct HTTP request...")
            hf_token = os.environ.get("HF_TOKEN", "")
            headers = {}
            if hf_token and hf_token.strip():
                headers["Authorization"] = f"Bearer {hf_token.strip()}"
            
            # Try the API endpoint directly
            api_url = "https://sadiaimran-styletts2-f1.hf.space/api/predict"
            payload = {
                "data": [text, voice, steps],
                "fn_index": 0
            }
            
            response = requests.post(
                api_url, 
                json=payload, 
                headers=headers, 
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if "data" in result and result["data"]:
                    # The result should contain the audio file path
                    audio_path = result["data"][0]
                    if audio_path and os.path.exists(audio_path):
                        with open(audio_path, "rb") as audio_file:
                            audio_bytes = audio_file.read()
                        
                        # Clean up
                        try:
                            os.remove(audio_path)
                        except Exception:
                            pass
                        
                        print(f"✅ TTS generated successfully via HTTP ({len(audio_bytes)} bytes)")
                        return base64.b64encode(audio_bytes).decode("utf-8")
            
        except Exception as e:
            print(f"⚠️ HTTP method failed: {e}")
        
        # Fallback to Gradio client
        print("🔄 Falling back to Gradio client...")
        tts_client = get_tts_client()
        
        # Use fn_index=1 directly since 0 fails
        print("🔄 Using fn_index: 1 (optimized)")
        result_path = tts_client.predict(text, voice, steps, fn_index=1)
        
        if result_path and os.path.exists(result_path):
            with open(result_path, "rb") as audio_file:
                audio_bytes = audio_file.read()
            
            # Clean up temp file
            try:
                os.remove(result_path)
            except Exception:
                pass
            
            print(f"✅ TTS generated successfully via Gradio ({len(audio_bytes)} bytes)")
            return base64.b64encode(audio_bytes).decode("utf-8")
        else:
            print(f"❌ No audio file generated at: {result_path}")
            return None
        
    except Exception as e:
        print(f"❌ TTS generation failed: {e}")
        return None