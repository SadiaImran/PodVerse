from fastapi import APIRouter, Form, Depends
import os, json , time , requests
from livekit import api
from dotenv import load_dotenv
from connection_supabase_client import get_authenticated_supabase_client
import jwt

load_dotenv()
router = APIRouter()

LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
LIVEKIT_WS_URL = os.getenv("LIVEKIT_URL")  
LIVEKIT_EGRESS_URL = os.getenv("LIVEKIT_EGRESS_URL")

SUPABASE_BUCKET = "recordings"
SUPABASE_S3_URL = os.getenv("SUPABASE_S3_URL")
SUPABASE_ACCESS_KEY = os.getenv("SUPABASE_ACCESS_KEY_ID")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_ACCESS_KEY")

# print("S3 Access Key:", SUPABASE_ACCESS_KEY)
# print("S3 Secret Key:", SUPABASE_SECRET_KEY)
# print("S3 Endpoint:", SUPABASE_S3_URL)

# print("Egress S3 config:")
# print("  bucket:", SUPABASE_BUCKET)
# print("  access_key:", SUPABASE_ACCESS_KEY)
# print("  secret:", SUPABASE_SECRET_KEY)
# print("  endpoint:", SUPABASE_S3_URL)

@router.post("/get-token")
def get_token(
    identity: str = Form(...),
    room_name: str = Form(...),
    user_id: str = Form(...),
    selected_kb_id: str = Form(None),
    agent_type: str = Form("host"),  # NEW: Agent type (host/guest)
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """Generate LiveKit token and embed user_id and selected KB as metadata."""

    supabase_authenticated = auth_data["client"]
    current_user_id = auth_data["user_id"]

    user_id_final = user_id or current_user_id

    print(f"🎟️ Token request: identity={identity}, room={room_name}, user_id={user_id_final}, kb_id={selected_kb_id}, agent_type={agent_type}")

    metadata_dict = {
        "userId": user_id_final,
        "selectedKbId": selected_kb_id,
        "agent_type": agent_type
    }
    metadata = json.dumps(metadata_dict)
    print("🧩 Token metadata dict:", metadata_dict)
    print("🧩 Token metadata JSON:", metadata)

    token = (
        api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
        .with_identity(identity)
        .with_name(identity)
        .with_grants(api.VideoGrants(room_join=True, room=room_name))
        .with_metadata(metadata)
    )

    return {"token": token.to_jwt(), "url": LIVEKIT_WS_URL}

active_egresses = {}

@router.post("/start-audio-egress")
async def start_audio_egress_async(
    room_name: str = Form(...),
    user_id: str = Form(None),
    kb_id: str = Form(None)
):
    """Start audio egress with custom file naming including user_id, kb_id, room_name, and timestamp."""
    # ✅ CRITICAL FIX: Convert wss:// to https:// for API endpoint
    api_host = LIVEKIT_WS_URL.replace("wss://", "https://").replace("ws://", "http://")
    
    print(f"🔗 LiveKit API Host: {api_host}")
    print(f"🔑 API Key: {LIVEKIT_API_KEY}")
    print(f"🎬 Starting egress for room: {room_name}")
    print(f"👤 User ID: {user_id}")
    print(f"📚 KB ID: {kb_id}")
    
    # Create custom filename with user_id, kb_id, room_name, and timestamp
    timestamp = time.strftime("%Y-%m-%dT%H%M%S")
    
    # Build filename: user[user_id]_kb[kb_id]_room[room_name]_[timestamp].ogg
    filename_parts = []
    
    if user_id:
        filename_parts.append(f"user_{user_id}")
    else:
        filename_parts.append("user_unknown")
        
    if kb_id:
        filename_parts.append(f"kb_{kb_id}")
    else:
        filename_parts.append("kb_unknown")
        
    filename_parts.append(f"room_{room_name}")
    filename_parts.append(timestamp)
    
    custom_filename = "_".join(filename_parts) + ".ogg"
    
    print(f"📁 Custom filename: {custom_filename}")

    # Create LiveKit API client with correct parameter order
    # Signature: LiveKitAPI(url, api_key, api_secret)
    lk_api = api.LiveKitAPI(
        url=api_host,
        api_key=LIVEKIT_API_KEY, 
        api_secret=LIVEKIT_API_SECRET
    )

    # Create egress request with custom filename and transcript
    req = api.RoomCompositeEgressRequest(
        room_name=room_name,
        audio_only=True,
        video_only=False,
        file_outputs=[
            api.EncodedFileOutput(
                file_type=api.EncodedFileType.OGG,
                filepath=custom_filename,  # Custom filename
                disable_manifest=True,  # Disable JSON metadata file
                s3=api.S3Upload(
                    bucket=SUPABASE_BUCKET,
                    access_key=SUPABASE_ACCESS_KEY,
                    secret=SUPABASE_SECRET_KEY,
                    region="",
                    endpoint=SUPABASE_S3_URL,
                    force_path_style=True,
                ),
            )
        ],
    )

    try:
        # Start egress
        res = await lk_api.egress.start_room_composite_egress(req)
        print(f"✅ Audio egress started successfully!")
        print(f"   Egress ID: {res.egress_id}")
        print(f"   Room: {room_name}")
        
        # Store egress info
        active_egresses[room_name] = {
            "egress_id": res.egress_id,
            "started_at": time.time()
        }
        
        return {
            "success": True,
            "egress_id": res.egress_id, 
            "room_name": room_name,
            "status": "started"
        }
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Egress failed: {error_msg}")
        
        # Check if it's a quota/limit error
        if "egress minutes exceeded" in error_msg or "resource_exhausted" in error_msg:
            print("⚠️ Egress quota exceeded - continuing without recording")
            return {
                "success": False,
                "error": "Egress quota exceeded",
                "room_name": room_name,
                "status": "quota_exceeded",
                "message": "Recording disabled due to quota limits"
            }
        else:
            print(f"❌ Other egress error: {error_msg}")
            import traceback
            traceback.print_exc()
            return {
                "success": False,
                "error": error_msg,
                "room_name": room_name,
                "status": "failed"
            }

@router.post("/stop-audio-egress")
async def stop_audio_egress_async(room_name: str = Form(...)):
    """Stop audio egress for a room and trigger file processing."""
    api_host = LIVEKIT_WS_URL.replace("wss://", "https://").replace("ws://", "http://")
    
    print(f"🛑 Stopping egress for room: {room_name}")
    
    # Get egress info
    egress_info = active_egresses.get(room_name)
    if not egress_info:
        return {
            "success": False,
            "error": f"No active egress found for room: {room_name}",
            "room_name": room_name
        }
    
    egress_id = egress_info["egress_id"]
    
    try:
        # Create LiveKit API client
        lk_api = api.LiveKitAPI(
            url=api_host,
            api_key=LIVEKIT_API_KEY, 
            api_secret=LIVEKIT_API_SECRET
        )
        
        # Stop the egress
        await lk_api.egress.stop_egress(api.StopEgressRequest(egress_id=egress_id))
        print(f"✅ Egress stopped successfully!")
        print(f"   Egress ID: {egress_id}")
        print(f"   Room: {room_name}")
        
        # Remove from active egresses
        del active_egresses[room_name]
        
        return {
            "success": True,
            "egress_id": egress_id,
            "room_name": room_name,
            "status": "stopped"
        }
        
    except Exception as e:
        print(f"❌ Failed to stop egress: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e),
            "room_name": room_name
        }

@router.get("/list-active-egresses")
async def list_active_egresses():
    """List all currently active egresses."""
    return {
        "active_egresses": active_egresses,
        "count": len(active_egresses)
    }

@router.post("/cleanup-old-egresses")
async def cleanup_old_egresses():
    """Clean up old egresses that might be stuck."""
    api_host = LIVEKIT_WS_URL.replace("wss://", "https://").replace("ws://", "http://")
    
    print(f"🧹 Cleaning up old egresses...")
    
    try:
        # Create LiveKit API client
        lk_api = api.LiveKitAPI(
            url=api_host,
            api_key=LIVEKIT_API_KEY, 
            api_secret=LIVEKIT_API_SECRET
        )
        
        # List all egresses
        egresses = await lk_api.egress.list_egress(api.ListEgressRequest())
        
        stopped_count = 0
        if hasattr(egresses, 'egress') and egresses.egress:
            for egress in egresses.egress:
                if egress.status in [api.EgressStatus.EGRESS_ACTIVE, api.EgressStatus.EGRESS_STARTING]:
                    try:
                        await lk_api.egress.stop_egress(api.StopEgressRequest(egress_id=egress.egress_id))
                        stopped_count += 1
                        print(f"🛑 Stopped old egress: {egress.egress_id}")
                    except Exception as e:
                        print(f"⚠️ Failed to stop egress {egress.egress_id}: {e}")
        
        # Clear our tracking
        active_egresses.clear()
        
        return {
            "success": True,
            "stopped_count": stopped_count,
            "message": f"Cleaned up {stopped_count} old egresses"
        }
        
    except Exception as e:
        print(f"❌ Cleanup failed: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

# Transcript is automatically generated by LiveKit egress - no manual endpoint needed!