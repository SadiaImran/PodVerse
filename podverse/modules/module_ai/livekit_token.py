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
LIVEKIT_WS_URL = os.getenv("LIVEKIT_URL", "wss://podverse-0nuzilmi.livekit.cloud")
LIVEKIT_EGRESS_URL = "https://egress.livekit.cloud/v1/egress"

@router.post("/get-token")
def get_token(
    identity: str = Form(...),
    room_name: str = Form(...),
    user_id: str = Form(...),
    selected_kb_id: str = Form(None),  # Add selected knowledge base ID
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """Generate LiveKit token and embed user_id and selected KB as metadata."""

    supabase_authenticated = auth_data["client"]
    current_user_id = auth_data["user_id"]  # verified via Bearer token

    # 🧩 Decide final user_id (prefer frontend one if provided)
    user_id_final = user_id or current_user_id

    print(f"🎟️ Token request: identity={identity}, room={room_name}, user_id={user_id_final}, kb_id={selected_kb_id}")

    # ✅ Add metadata with selected KB info
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

# @router.post("/start-recording")
# def start_livekit_recording(room_name: str = Form(...)):
#     jwt_token = generate_livekit_jwt(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
#     payload = {
#         "room_name": room_name,
#         "audio_only": True,
#         "output": {
#             "file": {
#                 "filepath": f"{room_name}_{int(time.time())}.mp3",
#                 "output_type": "mp3"
#             }
#         }
#     }
#     headers = {"Authorization": f"Bearer {jwt_token}"}
#     resp = requests.post(
#         LIVEKIT_EGRESS_URL,
#         json=payload,
#         headers=headers
#     )
#     print("[Egress] Start recording response:", resp.status_code, resp.text)
#     return resp.json() if resp.status_code == 200 else None

# def generate_livekit_jwt(api_key, api_secret):
#     payload = {
#         "iss": api_key,
#         "exp": int(time.time()) + 60 * 10,
#         "nbf": int(time.time()),
#         "video": {
#             "egress": True
#         }
#     }
#     token = jwt.encode(payload, api_secret, algorithm="HS256")
#     return token
