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
LIVEKIT_WS_URL = os.getenv("LIVEKIT_URL")  # wss:// for client connections
LIVEKIT_EGRESS_URL = os.getenv("LIVEKIT_EGRESS_URL")

SUPABASE_BUCKET = "recordings"
SUPABASE_S3_URL = os.getenv("SUPABASE_S3_URL")
SUPABASE_ACCESS_KEY = os.getenv("SUPABASE_ACCESS_KEY")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY")

@router.post("/get-token")
def get_token(
    identity: str = Form(...),
    room_name: str = Form(...),
    user_id: str = Form(...),
    selected_kb_id: str = Form(None),
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """Generate LiveKit token and embed user_id and selected KB as metadata."""

    supabase_authenticated = auth_data["client"]
    current_user_id = auth_data["user_id"]

    user_id_final = user_id or current_user_id

    print(f"🎟️ Token request: identity={identity}, room={room_name}, user_id={user_id_final}, kb_id={selected_kb_id}")

    metadata_dict = {
        "userId": user_id_final,
        "selectedKbId": selected_kb_id
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
async def start_audio_egress_async(room_name: str = Form(...)):
    # ✅ CRITICAL FIX: Convert wss:// to https:// for API endpoint
    api_host = LIVEKIT_WS_URL.replace("wss://", "https://").replace("ws://", "http://")
    
    print(f"🔗 LiveKit API Host: {api_host}")
    print(f"🔑 API Key: {LIVEKIT_API_KEY}")
    print(f"🎬 Starting egress for room: {room_name}")
    
    # Create LiveKit API client with correct parameter order
    # Signature: LiveKitAPI(url, api_key, api_secret)
    lk_api = api.LiveKitAPI(
        url=api_host,
        api_key=LIVEKIT_API_KEY, 
        api_secret=LIVEKIT_API_SECRET
    )

    # Create egress request
    req = api.RoomCompositeEgressRequest(
        room_name=room_name,
        audio_only=True,
        video_only=False,
        file_outputs=[
            api.EncodedFileOutput(
                file_type=api.EncodedFileType.OGG,
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
        print(f"❌ Egress failed: {str(e)}")
        import traceback
        traceback.print_exc()
        raise