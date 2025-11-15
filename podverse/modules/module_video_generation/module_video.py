import time
import requests
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
import os
from typing import Optional, List

# Configuration
HEYGEN_API_KEY = os.environ.get("HEYGEN_API_KEY")
HEYGEN_BASE = "https://api.heygen.com"

HEADERS = {
    "X-Api-Key": HEYGEN_API_KEY,
    "Content-Type": "application/json"
}

router = APIRouter()

class GenerateRequest(BaseModel):
    avatar_id: str
    voice_id: str
    input_text: str

class StatusResponse(BaseModel):
    video_id: str
    status: str
    video_url: Optional[str] = None

class AvatarInfo(BaseModel):
    avatar_id: str
    avatar_name: str
    preview_image_url: str = None
    gender: str = None

class VoiceInfo(BaseModel):
    voice_id: str
    name: str
    language: str
    gender: str = None
    preview_audio: str = None

# Optional: Add auth verification
async def verify_token(authorization: Optional[str] = Header(None)):
    """Verify the authorization token - adjust based on your auth system"""
    if not authorization:
        print("⚠️  No authorization header provided (using default behavior)")
    return authorization


# --- Get Available Avatars ---

@router.get("/api/list-avatars")
async def list_avatars(authorization: str = Depends(verify_token)):
    """
    Retrieve all available public avatars from HeyGen.
    These are pre-made avatars that don't require training.
    """
    if not HEYGEN_API_KEY:
        raise HTTPException(status_code=500, detail="HEYGEN_API_KEY not configured in environment")
    
    try:
        print("📋 Fetching available avatars from HeyGen...")
        avatars_url = f"{HEYGEN_BASE}/v2/avatars"
        
        resp = requests.get(avatars_url, headers=HEADERS, timeout=30)
        
        if resp.status_code != 200:
            print(f"❌ Failed to fetch avatars ({resp.status_code}): {resp.text}")
            raise HTTPException(status_code=resp.status_code, detail=f"Failed to fetch avatars: {resp.text}")
        
        data = resp.json().get("data", {})
        avatars = data.get("avatars", [])
        
        # Filter and format avatar data
        formatted_avatars = []
        for avatar in avatars:
            formatted_avatars.append({
                "avatar_id": avatar.get("avatar_id"),
                "avatar_name": avatar.get("avatar_name"),
                "preview_image_url": avatar.get("preview_image_url") or avatar.get("image_url"),
                "gender": avatar.get("gender"),
                "preview_video_url": avatar.get("preview_video_url")
            })
        
        print(f"✅ Found {len(formatted_avatars)} avatars")
        
        return {
            "avatars": formatted_avatars,
            "total": len(formatted_avatars)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching avatars: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch avatars: {str(e)}")


# --- Get Available Voices ---

@router.get("/api/list-voices")
async def list_voices(authorization: str = Depends(verify_token)):
    """
    Retrieve all available voices from HeyGen.
    These are AI-generated voices in various languages.
    """
    if not HEYGEN_API_KEY:
        raise HTTPException(status_code=500, detail="HEYGEN_API_KEY not configured in environment")
    
    try:
        print("🎤 Fetching available voices from HeyGen...")
        voices_url = f"{HEYGEN_BASE}/v2/voices"
        
        resp = requests.get(voices_url, headers=HEADERS, timeout=30)
        
        if resp.status_code != 200:
            print(f"❌ Failed to fetch voices ({resp.status_code}): {resp.text}")
            raise HTTPException(status_code=resp.status_code, detail=f"Failed to fetch voices: {resp.text}")
        
        data = resp.json().get("data", {})
        voices = data.get("voices", [])
        
        # Filter and format voice data
        formatted_voices = []
        for voice in voices:
            formatted_voices.append({
                "voice_id": voice.get("voice_id"),
                "name": voice.get("name"),
                "language": voice.get("language"),
                "gender": voice.get("gender"),
                "preview_audio": voice.get("preview_audio"),
                "support_pause": voice.get("support_pause", False),
                "emotion_support": voice.get("emotion_support", False)
            })
        
        print(f"✅ Found {len(formatted_voices)} voices")
        
        return {
            "voices": formatted_voices,
            "total": len(formatted_voices)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching voices: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch voices: {str(e)}")


@router.post("/api/generate-video")
def generate_video(
    req: GenerateRequest,
    authorization: str = Depends(verify_token)
):
    """
    Generates a video using predefined HeyGen avatar and voice.
    Both avatar_id and voice_id should be from their respective list endpoints.
    """
    print(f"🎬 Generating video with avatar: {req.avatar_id}, voice: {req.voice_id}")
    
    if not HEYGEN_API_KEY:
        raise HTTPException(status_code=500, detail="HEYGEN_API_KEY not configured")
    
    generate_url = f"{HEYGEN_BASE}/v2/video/generate"
    
    # Use regular avatar type with predefined voice
    payload = {
        "video_inputs": [
            {
                "character": {
                    "type": "avatar",
                    "avatar_id": req.avatar_id,
                    "avatar_style": "normal"
                },
                "voice": {
                    "type": "text",
                    "input_text": req.input_text,
                    "voice_id": req.voice_id
                },
                "background": {
                    "type": "color",
                    "value": "#FFFFFF"
                }
            }
        ],
        "dimension": {
            "width": 1280,
            "height": 720
        }
    }

    try:
        print(f"📤 Posting to: {generate_url}")
        print(f"📝 Payload: {payload}")
        
        resp = requests.post(generate_url, json=payload, headers=HEADERS, timeout=30)
        
        print(f"📊 Response status: {resp.status_code}")
        
        if resp.status_code != 200:
            print(f"📊 Response body: {resp.text}")
            raise HTTPException(status_code=resp.status_code, detail=f"HeyGen generate error: {resp.text}")

        resp_data = resp.json()
        video_id = resp_data.get("data", {}).get("video_id") or resp_data.get("video_id")
        
        if not video_id:
            raise HTTPException(status_code=500, detail=f"No video_id in response: {resp_data}")
        
        print(f"✅ Video generation started: {video_id}")
        return {"video_id": video_id}
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error during generation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Generation error: {str(e)}")


@router.get("/api/video-status/{video_id}", response_model=StatusResponse)
def video_status(
    video_id: str,
    authorization: str = Depends(verify_token)
):
    """Checks the status of a generated video using the HeyGen V2 endpoint."""
    print(f"📊 Checking status for video: {video_id}")
    
    if not HEYGEN_API_KEY:
        raise HTTPException(status_code=500, detail="HEYGEN_API_KEY not configured")
    
    status_url = f"{HEYGEN_BASE}/v1/video_status.get?video_id={video_id}"
    
    try:
        print(f"📤 Getting status from: {status_url}")
        resp = requests.get(status_url, headers=HEADERS, timeout=30)
        
        if resp.status_code != 200:
            print(f"❌ Status check failed ({resp.status_code}): {resp.text}")
            raise HTTPException(status_code=resp.status_code, detail=f"HeyGen status check failed: {resp.text}")

        data = resp.json().get("data", {})
        status = data.get("status")
        video_url = data.get("video_url")
        
        if not status:
            raise HTTPException(status_code=500, detail=f"Invalid status response: {resp.text}")

        print(f"📊 Video status: {status}")
        return {"video_id": video_id, "status": status, "video_url": video_url}
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error during status check: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Status check error: {str(e)}")


@router.get("/api/test")
def test_endpoint():
    return {
        "status": "ok",
        "heygen_api_key_set": bool(HEYGEN_API_KEY),
        "heygen_base": HEYGEN_BASE,
        "endpoints": {
            "list_avatars": "/api/list-avatars (get predefined avatars)",
            "list_voices": "/api/list-voices (get predefined voices)",
            "generate_video": "/api/generate-video (use avatar_id and voice_id)",
            "video_status": "/api/video-status/{video_id}"
        }
    }