from fastapi import APIRouter, Form, HTTPException
from fastapi.params import Depends
from connection_supabase_client import get_authenticated_supabase_client
from .prompts import PodcastManager
from .speech import generate_tts_audio

router = APIRouter()
podcast_manager = PodcastManager()

@router.post("/podcast/turn/")
async def enhanced_podcast_turn(
    message: str = Form(...),
    persona: str = Form("guest"),
    show_name: str = Form("AI Knowledge Podcast"),
    conversation_id: str = Form("default"),
    guest_name: str = Form("Expert Guest"),
    auto_duet: bool = Form(False),
    is_conversation_start: bool = Form(False),
    podcast_title: str = Form(None),  # NEW: Podcast title/topic
    auth_data: dict = Depends(get_authenticated_supabase_client),
):
    """Enhanced podcast conversation with natural flow and proper host/guest dynamics"""
    try:
        supabase_authenticated = auth_data["client"]
        user_id = auth_data["user_id"]
        
        # Check if user has documents
        try:
            docs_check = (
                supabase_authenticated.table("documents")
                .select("id")
                .eq("user_id", user_id)
                .limit(1)
                .execute()
            )
            if not docs_check.data:
                error_msg = "I'd love to chat, but I don't have any documents to discuss yet. Please upload some content first!"
                return {
                    "answer_text": error_msg,
                    "sources": [],
                    "audio_data": generate_tts_audio(error_msg),
                    "audio_type": "audio/wav"
                }
        except Exception as e:
            print(f"Document check error: {e}")
        
        # Use podcast_title if provided, otherwise use show_name
        effective_show_name = podcast_title if podcast_title else show_name
        
        # Use podcast manager to handle the conversation
        result = podcast_manager.handle_turn(
            supabase_authenticated, user_id, message, persona, 
            effective_show_name, conversation_id, guest_name, auto_duet, is_conversation_start
        )
        
        return result
    
    except Exception as e:
        print(f"Enhanced podcast turn error: {e}")
        error_msg = "Sorry, I'm having trouble right now. Can we try that again?"
        return {
            "answer_text": error_msg,
            "sources": [],
            "audio_data": generate_tts_audio(error_msg),
            "audio_type": "audio/wav"
        }

@router.post("/podcast/start/")
async def start_podcast_conversation(
    show_name: str = Form("AI Knowledge Podcast"),
    guest_name: str = Form("Expert Guest"),
    conversation_id: str = Form("default"),
    podcast_title: str = Form(None),  # NEW: Podcast title/topic
    auth_data: dict = Depends(get_authenticated_supabase_client),
):
    """Start a new podcast conversation with host opening"""
    try:
        supabase_authenticated = auth_data["client"]
        user_id = auth_data["user_id"]
        
        # Use podcast_title if provided, otherwise use show_name
        effective_show_name = podcast_title if podcast_title else show_name
        
        result = podcast_manager.start_conversation(
            supabase_authenticated, user_id, effective_show_name, guest_name, conversation_id
        )
        
        return result
    
    except Exception as e:
        print(f"Start podcast error: {e}")
        raise HTTPException(status_code=500, detail=str(e))