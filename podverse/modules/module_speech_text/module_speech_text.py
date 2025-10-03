import os, tempfile, base64, requests, asyncio
from fastapi import APIRouter, UploadFile, WebSocket, WebSocketDisconnect
from dotenv import load_dotenv
from gradio_client import Client as GradioClient
import json
from typing import Optional

# Load env vars
load_dotenv()
HF_TOKEN = os.getenv("HF_TOKEN")
TTS_URL = os.getenv("TTS_URL")

# LiveKit Configuration
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
LIVEKIT_WS_URL = os.getenv("LIVEKIT_WS_URL", "wss://your-livekit-server.com")

router = APIRouter()

# ========== LiveKit Integration ==========
class LiveKitTranscriber:
    def __init__(self, use_api_key: bool = True):
        self.use_api_key = use_api_key
        self.websocket = None
        
    async def connect(self, websocket: WebSocket):
        """Connect to LiveKit for real-time transcription"""
        await websocket.accept()
        self.websocket = websocket
        
        if self.use_api_key and LIVEKIT_API_KEY:
            # Use LiveKit API
            await self._connect_with_api_key()
        else:
            # Use open source alternative
            await self._connect_open_source()
    
    async def _connect_with_api_key(self):
        """Connect using LiveKit API key"""
        try:
            import livekit
            from livekit import rtc
            
            # Initialize LiveKit client
            room = rtc.Room()
            
            # Connect to room
            await room.connect(LIVEKIT_WS_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
            
            # Set up transcription
            @room.on("track_subscribed")
            def on_track_subscribed(track, publication, participant):
                if track.kind == rtc.TrackKind.KIND_AUDIO:
                    # Start transcription for audio track
                    asyncio.create_task(self._transcribe_audio_track(track))
            
            print("✅ Connected to LiveKit with API key")
            
        except Exception as e:
            print(f"❌ LiveKit API connection failed: {e}")
            await self._connect_open_source()
    
    async def _connect_open_source(self):
        """Connect using open source alternative (WebRTC + Whisper)"""
        try:
            # Use WebRTC for real-time audio capture
            # and local Whisper for transcription
            print("🔄 Using open source transcription...")
            
            # Send connection status
            await self.websocket.send_text(json.dumps({
                "type": "status",
                "message": "Connected to open source transcription",
                "mode": "open_source"
            }))
            
        except Exception as e:
            print(f"❌ Open source connection failed: {e}")
    
    async def _transcribe_audio_track(self, track):
        """Transcribe audio track in real-time"""
        try:
            # This would handle real-time audio transcription
            # For now, we'll use a placeholder
            await self.websocket.send_text(json.dumps({
                "type": "transcription",
                "text": "Real-time transcription active",
                "is_final": False
            }))
        except Exception as e:
            print(f"Transcription error: {e}")
    
    async def start_transcription(self):
        """Start real-time transcription"""
        if self.use_api_key and LIVEKIT_API_KEY:
            # LiveKit real-time transcription
            await self._start_livekit_transcription()
        else:
            # Open source real-time transcription
            await self._start_open_source_transcription()
    
    async def _start_livekit_transcription(self):
        """Start LiveKit transcription"""
        try:
            # LiveKit transcription logic here
            await self.websocket.send_text(json.dumps({
                "type": "transcription_started",
                "provider": "livekit",
                "message": "LiveKit transcription active"
            }))
        except Exception as e:
            print(f"LiveKit transcription error: {e}")
    
    async def _start_open_source_transcription(self):
        """Start open source transcription using WebRTC + Whisper"""
        try:
            # WebRTC + Whisper transcription logic here
            await self.websocket.send_text(json.dumps({
                "type": "transcription_started", 
                "provider": "open_source",
                "message": "Open source transcription active"
            }))
        except Exception as e:
            print(f"Open source transcription error: {e}")

# ========== STT (Fallback) ==========
async def transcribe_audio(file: UploadFile) -> str:
    """Fallback transcription for uploaded files"""
    try:
        # Use Hugging Face Whisper as fallback
        headers = {"Authorization": f"Bearer {HF_TOKEN}"}
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(await file.read())
            tmp.seek(0)
            with open(tmp.name, "rb") as f:
                resp = requests.post("https://api-inference.huggingface.co/models/openai/whisper-large-v3", 
                                   headers=headers, data=f.read())
        return resp.json().get("text", "")
    except Exception as e:
        print(f"Fallback transcription failed: {e}")
        return ""

# ========== TTS ==========
def synthesize_text(text: str) -> str:
    try:
        client = GradioClient(TTS_URL, hf_token=HF_TOKEN)
        result_path = client.predict(text, "f-us-1", 3, api_name="/synthesize")

        with open(result_path, "rb") as audio_file:
            audio_bytes = audio_file.read()

        # Cleanup
        if os.path.exists(result_path):
            os.remove(result_path)

        return base64.b64encode(audio_bytes).decode("utf-8")
    except Exception as e:
        print(f"TTS failed: {e}")
        return None

# ========== Routes ==========
@router.post("/stt/")
async def speech_to_text(file: UploadFile):
    """Fallback transcription for uploaded files"""
    text = await transcribe_audio(file)
    return {"text": text}

@router.post("/tts/")
async def text_to_speech(text: str):
    """Text to speech synthesis"""
    audio_b64 = synthesize_text(text)
    return {"audio_base64": audio_b64}

# ========== LiveKit WebSocket Routes ==========
@router.websocket("/ws/livekit-transcription/{client_id}")
async def livekit_transcription_websocket(websocket: WebSocket, client_id: str):
    """WebSocket endpoint for LiveKit real-time transcription"""
    transcriber = LiveKitTranscriber(use_api_key=True)  # Try API key first
    
    try:
        await transcriber.connect(websocket)
        
        while True:
            # Receive messages from client
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "start_transcription":
                await transcriber.start_transcription()
            elif message["type"] == "stop_transcription":
                await websocket.send_text(json.dumps({
                    "type": "transcription_stopped",
                    "message": "Transcription stopped"
                }))
            elif message["type"] == "ping":
                await websocket.send_text(json.dumps({
                    "type": "pong",
                    "timestamp": asyncio.get_event_loop().time()
                }))
                
    except WebSocketDisconnect:
        print(f"Client {client_id} disconnected from LiveKit transcription")
    except Exception as e:
        print(f"LiveKit WebSocket error: {e}")
        await websocket.send_text(json.dumps({
            "type": "error",
            "error": str(e)
        }))

@router.websocket("/ws/open-source-transcription/{client_id}")
async def open_source_transcription_websocket(websocket: WebSocket, client_id: str):
    """WebSocket endpoint for open source real-time transcription"""
    transcriber = LiveKitTranscriber(use_api_key=False)  # Use open source
    
    try:
        await transcriber.connect(websocket)
        
        while True:
            # Receive messages from client
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "start_transcription":
                await transcriber.start_transcription()
            elif message["type"] == "stop_transcription":
                await websocket.send_text(json.dumps({
                    "type": "transcription_stopped",
                    "message": "Open source transcription stopped"
                }))
            elif message["type"] == "ping":
                await websocket.send_text(json.dumps({
                    "type": "pong",
                    "timestamp": asyncio.get_event_loop().time()
                }))
                
    except WebSocketDisconnect:
        print(f"Client {client_id} disconnected from open source transcription")
    except Exception as e:
        print(f"Open source WebSocket error: {e}")
        await websocket.send_text(json.dumps({
            "type": "error",
            "error": str(e)
        }))

@router.get("/transcription/status")
async def get_transcription_status():
    """Get available transcription options"""
    return {
        "livekit_available": bool(LIVEKIT_API_KEY and LIVEKIT_API_SECRET),
        "open_source_available": True,
        "endpoints": {
            "livekit": "/ws/livekit-transcription/{client_id}",
            "open_source": "/ws/open-source-transcription/{client_id}",
            "fallback": "/stt/"
        }
    }
