#module_video.py
import time
import requests
from fastapi import APIRouter, HTTPException, Depends, Header, File, UploadFile
from pydantic import BaseModel
import os
from typing import Optional, List

# Configuration
HEYGEN_API_KEY = os.environ.get("HEYGEN_API_KEY")
HEYGEN_BASE = "https://api.heygen.com"
HEYGEN_UPLOAD_BASE = "https://upload.heygen.com"  # Different base URL for uploads

HEADERS = {
    "X-Api-Key": HEYGEN_API_KEY,
    "Content-Type": "application/json"
}

def get_upload_headers(content_type: str):
    """Get headers for file upload with proper Content-Type"""
    return {
        "X-Api-Key": HEYGEN_API_KEY,
        "Content-Type": content_type
    }

router = APIRouter()

class GenerateRequest(BaseModel):
    avatar_id: str
    voice_id: Optional[str] = None  # Make optional
    input_text: Optional[str] = None  # Make optional
    input_type: Optional[str] = "text"  # Add input_type field
    audio_asset_id: Optional[str] = None  # Add audio_asset_id field
    is_custom_avatar: Optional[bool] = False

class CreateAvatarRequest(BaseModel):
    name: str
    image_key: str

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


@router.post("/api/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    authorization: str = Depends(verify_token)
):
    """
    Upload a user's image file to HeyGen platform.
    Returns an image_key (asset_id) that can be used to create a photo avatar.
    
    Reference: https://docs.heygen.com/reference/upload-asset
    Endpoint: POST https://upload.heygen.com/v1/asset
    The file is sent as raw binary data in the request body.
    """
    if not HEYGEN_API_KEY:
        raise HTTPException(status_code=500, detail="HEYGEN_API_KEY is not set.")
    
    # Read file content as binary
    file_content = await file.read()
    
    # Determine Content-Type based on file type
    # Map common image MIME types
    content_type = file.content_type
    if not content_type:
        # Try to infer from filename
        if file.filename:
            if file.filename.lower().endswith('.png'):
                content_type = 'image/png'
            elif file.filename.lower().endswith(('.jpg', '.jpeg')):
                content_type = 'image/jpeg'
            else:
                content_type = 'image/jpeg'  # Default
        else:
            content_type = 'image/jpeg'  # Default
    
    # Validate that it's an image
    if not content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail=f"Invalid file type: {content_type}. Only image files are supported.")
    
    # Prepare headers with Content-Type and API key
    # Reference: https://docs.heygen.com/reference/upload-asset
    upload_headers = get_upload_headers(content_type)
    
    # Upload endpoint: https://upload.heygen.com/v1/asset
    # File is sent as raw binary data in the request body
    upload_url = f"{HEYGEN_UPLOAD_BASE}/v1/asset"
    
    try:
        print(f"📤 Uploading image to: {upload_url}")
        print(f"📝 Content-Type: {content_type}, File size: {len(file_content)} bytes")
        
        # Send file as raw binary data in the request body
        resp = requests.post(
            upload_url,
            headers=upload_headers,
            data=file_content,  # Raw binary data, not multipart/form-data
            timeout=60  # Longer timeout for file uploads
        )
        
        print(f"📊 Response status: {resp.status_code}")
        
        if resp.status_code != 200:
            print(f"📊 Response body: {resp.text[:500]}")
            resp.raise_for_status()
        
        resp_data = resp.json()
        
        # The response should contain the asset_id (which is the image_key)
        # Check different possible response formats
        image_key = (
            resp_data.get("data", {}).get("asset_id") or
            resp_data.get("data", {}).get("image_key") or
            resp_data.get("asset_id") or
            resp_data.get("image_key") or
            resp_data.get("data", {}).get("id")
        )
        
        if not image_key:
            print(f"⚠️  Response data: {resp_data}")
            raise HTTPException(
                status_code=500, 
                detail=f"Asset ID not found in HeyGen response. Response: {resp_data}"
            )
        
        print(f"✅ Image uploaded successfully, asset_id (image_key): {image_key}")
        return {"image_key": image_key}
        
    except requests.exceptions.RequestException as e:
        print(f"❌ HeyGen Upload Asset error: {e}")
        error_detail = resp.text if 'resp' in locals() else str(e)
        status_code = resp.status_code if 'resp' in locals() else 500
        print(f"📊 Response status: {status_code}")
        print(f"📊 Response body: {error_detail[:500]}")
        raise HTTPException(
            status_code=status_code, 
            detail=f"HeyGen upload error: {error_detail[:200]}"
        )
    except Exception as e:
        print(f"❌ Error during upload: {e}")
        raise HTTPException(status_code=500, detail=f"Error uploading image: {str(e)}")


@router.post("/api/create-photo-avatar")
def create_photo_avatar(
    request: CreateAvatarRequest,
    authorization: str = Depends(verify_token)
):
    """
    Create a photo avatar from an uploaded image using HeyGen's Avatar IV (Single Photo) method.
    Returns the avatar_id (talking_photo_id) that can be used for video generation.
    """
    if not HEYGEN_API_KEY:
        raise HTTPException(status_code=500, detail="HEYGEN_API_KEY is not set.")
        
    create_url = f"{HEYGEN_BASE}/v2/photo_avatar/avatar_group/create"
    
    payload = {
        "name": request.name,
        "image_key": request.image_key
    }
    
    try:
        resp = requests.post(create_url, headers=HEADERS, json=payload)
        resp.raise_for_status()
        
        resp_data = resp.json()
        
        # The ID returned here is the avatar/look ID (talking_photo_id)
        # for use in the video generation API call.
        avatar_id = resp_data.get("data", {}).get("id")
        preview_image_url = resp_data.get("data", {}).get("image_url")
        
        if not avatar_id:
            raise HTTPException(status_code=500, detail="Avatar ID not found in HeyGen response.")
            
        print(f"✅ Photo Avatar created, ID: {avatar_id}")
        return {"avatar_id": avatar_id, "preview_image_url": preview_image_url}
        
    except requests.exceptions.RequestException as e:
        print(f"❌ HeyGen Create Avatar error: {e}")
        raise HTTPException(
            status_code=resp.status_code if 'resp' in locals() else 500, 
            detail=f"HeyGen create error: {resp.text if 'resp' in locals() else str(e)}"
        )


@router.post("/api/generate-video")
def generate_video(
    req: GenerateRequest,
    authorization: str = Depends(verify_token)
):
    """
    Generates a video using HeyGen avatar and voice.
    Supports both predefined avatars and custom photo avatars.
    Supports both text input (TTS) and audio input (original voice).
    """
    print(f"🎬 Generating video with avatar: {req.avatar_id}, input_type: {req.input_type}, is_custom: {req.is_custom_avatar}")
    
    if not HEYGEN_API_KEY:
        raise HTTPException(status_code=500, detail="HEYGEN_API_KEY not configured")
    
    generate_url = f"{HEYGEN_BASE}/v2/video/generate"
    
    # Determine character settings based on avatar type
    if req.is_custom_avatar:
        character_settings = {
            "type": "talking_photo",
            "talking_photo_id": req.avatar_id
        }
    else:
        character_settings = {
            "type": "avatar",
            "avatar_id": req.avatar_id,
            "avatar_style": "normal"
        }
    
    # Determine voice settings based on input type
    if req.input_type == "audio" and req.audio_asset_id:
        # Use uploaded audio
        voice_settings = {
            "type": "audio",
            "audio_asset_id": req.audio_asset_id
        }
        print(f"🎤 Using audio input: {req.audio_asset_id}")
    else:
        # Use TTS
        if not req.voice_id or not req.input_text:
            raise HTTPException(status_code=400, detail="voice_id and input_text required for text input")
        
        voice_settings = {
            "type": "text",
            "input_text": req.input_text,
            "voice_id": req.voice_id
        }
        print(f"🎤 Using TTS: voice_id={req.voice_id}")
    
    payload = {
        "video_inputs": [
            {
                "character": character_settings,
                "voice": voice_settings,
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