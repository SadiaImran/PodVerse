from fastapi import APIRouter
from pydantic import BaseModel
import os
from livekit import api
from dotenv import load_dotenv

load_dotenv()
router = APIRouter()
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
LIVEKIT_WS_URL = os.getenv("LIVEKIT_URL", "wss://podverse-0nuzilmi.livekit.cloud")

class TokenRequest(BaseModel):
    identity: str
    room_name: str

@router.post("/get-token")
def get_token(req: TokenRequest):
    print("🎟️ Token request", req.identity, req.room_name)
    token = api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)\
             .with_identity(req.identity)\
             .with_name(req.identity)\
             .with_grants(api.VideoGrants(room_join=True, room=req.room_name))
    return {"token": token.to_jwt(), "url": LIVEKIT_WS_URL}
