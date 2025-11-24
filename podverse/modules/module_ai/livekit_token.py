from fastapi import APIRouter, Form, Depends
import os, json , time , requests, asyncio
from livekit import api
from dotenv import load_dotenv
from connection_supabase_client import get_authenticated_supabase_client, get_service_role_client
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
    host_persona: str = Form(None),  # NEW: Host persona data (name, tone, avatar)
    guest_persona: str = Form(None),  # NEW: Guest persona data
    voice_name: str = Form(None),  # NEW: Gemini voice name
    podcast_title: str = Form(None),  # NEW: Podcast title/topic
    podcast_description: str = Form(None),  # NEW: Podcast description
    podcast_tags: str = Form(None),  # NEW: Podcast tags (JSON array)
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """Generate LiveKit token and embed user_id and selected KB as metadata."""

    supabase_authenticated = auth_data["client"]
    current_user_id = auth_data["user_id"]

    user_id_final = user_id or current_user_id

    # Parse podcast tags if provided
    podcast_tags_list = None
    if podcast_tags:
        try:
            podcast_tags_list = json.loads(podcast_tags)
            print(f"🏷️ Podcast tags received: {podcast_tags_list}")
        except json.JSONDecodeError as e:
            print(f"⚠️ Failed to parse podcast tags: {e}")
    
    print(f"🎟️ Token request: identity={identity}, room={room_name}, user_id={user_id_final}, kb_id={selected_kb_id}, agent_type={agent_type}, voice_name={voice_name}, podcast_title={podcast_title}, description={podcast_description}, tags={podcast_tags_list}")
    
    # Parse host persona if provided
    host_persona_data = None
    if host_persona and agent_type == "host":
        try:
            host_persona_data = json.loads(host_persona)
            print(f"🎙️ Host persona received: {host_persona_data}")
        except json.JSONDecodeError as e:
            print(f"⚠️ Failed to parse host persona: {e}")
    
    # Parse guest persona if provided
    guest_persona_data = None
    if guest_persona and agent_type == "guest":
        try:
            guest_persona_data = json.loads(guest_persona)
            print(f"🎭 Guest persona received: {guest_persona_data}")
        except json.JSONDecodeError as e:
            print(f"⚠️ Failed to parse guest persona: {e}")

    metadata_dict = {
        "userId": user_id_final,
        "selectedKbId": selected_kb_id,
        "agent_type": agent_type
    }
    
    # Add host persona to metadata if available
    if host_persona_data:
        metadata_dict["host_persona"] = host_persona_data
        print(f"🎙️ Host persona added to metadata: {host_persona_data}")
    
    # Add guest persona to metadata if available
    if guest_persona_data:
        metadata_dict["guest_persona"] = guest_persona_data
        print(f"🎭 Guest persona added to metadata: {guest_persona_data}")
    
    # Add voice name to metadata if available
    if voice_name:
        metadata_dict["voice_name"] = voice_name
        print(f"🎤 Voice name added to metadata: {voice_name}")
    
    # Add podcast configuration to metadata if available
    if podcast_title:
        metadata_dict["podcast_title"] = podcast_title
        print(f"📝 Podcast title added to metadata: {podcast_title}")
    
    if podcast_description:
        metadata_dict["podcast_description"] = podcast_description
        print(f"📄 Podcast description added to metadata: {podcast_description[:100]}...")
    
    if podcast_tags_list:
        metadata_dict["podcast_tags"] = podcast_tags_list
        print(f"🏷️ Podcast tags added to metadata: {podcast_tags_list}")
    
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
egress_starting_rooms = set()

@router.post("/start-audio-egress")
async def start_audio_egress_async(
    room_name: str = Form(...),
    user_id: str = Form(None),
    kb_id: str = Form(None),
    podcast_title: str = Form(None)
):
    """Start audio egress with custom file naming using podcast title."""
    if room_name in egress_starting_rooms:
        print(f"⏳ Egress start already in progress for room: {room_name}")
        return {
            "success": True,
            "status": "starting",
            "room_name": room_name,
            "message": "Egress start already in progress for this room"
        }
    
    existing_egress = active_egresses.get(room_name)
    if existing_egress:
        print(f"ℹ️ Egress already active for room: {room_name} (egress_id={existing_egress.get('egress_id')})")
        return {
            "success": True,
            "status": "already_running",
            "room_name": room_name,
            "egress_id": existing_egress.get("egress_id"),
            "filename": existing_egress.get("filename"),
            "message": "Recording already running for this room"
        }
    
    egress_starting_rooms.add(room_name)
    
    # ✅ CRITICAL FIX: Convert wss:// to https:// for API endpoint
    api_host = LIVEKIT_WS_URL.replace("wss://", "https://").replace("ws://", "http://")
    
    print(f"🔗 LiveKit API Host: {api_host}")
    print(f"🔑 API Key: {LIVEKIT_API_KEY}")
    print(f"🎬 Starting egress for room: {room_name}")
    print(f"👤 User ID: {user_id}")
    print(f"📚 KB ID: {kb_id}")
    print(f"📝 Podcast Title: {podcast_title}")
    
    # Create custom filename using podcast title (clean and readable)
    timestamp = time.strftime("%Y-%m-%dT%H%M%S")
    
    # Use podcast title if available, otherwise fallback to default naming
    if podcast_title:
        # Clean podcast title for filename (remove special chars, spaces to underscores)
        import re
        clean_title = re.sub(r'[^\w\s-]', '', podcast_title)  # Remove special chars
        clean_title = re.sub(r'[-\s]+', '_', clean_title)  # Replace spaces/hyphens with underscore
        clean_title = clean_title.strip('_')  # Remove leading/trailing underscores
        clean_title = clean_title[:50]  # Limit length
        custom_filename = f"{clean_title}_{timestamp}.ogg"
    else:
        # Fallback to old naming if no podcast title
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
        
        # Store egress info including filename for URL generation
        active_egresses[room_name] = {
            "egress_id": res.egress_id,
            "started_at": time.time(),
            "filename": custom_filename  # Store filename for URL generation
        }
        
        return {
            "success": True,
            "egress_id": res.egress_id, 
            "room_name": room_name,
            "status": "started",
            "filename": custom_filename
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
    finally:
        egress_starting_rooms.discard(room_name)

@router.post("/stop-audio-egress")
async def stop_audio_egress_async(room_name: str = Form(...)):
    """Stop audio egress for a room and trigger file processing. Returns signed URL for private bucket."""
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
        
        # Check egress status before trying to stop
        try:
            egress_list = await lk_api.egress.list_egress(api.ListEgressRequest(egress_id=egress_id))
            egress_status = None
            if hasattr(egress_list, 'egress') and egress_list.egress:
                for egress in egress_list.egress:
                    if egress.egress_id == egress_id:
                        egress_status = egress.status
                        print(f"📊 Egress status: {egress_status}")
                        break
        except Exception as status_error:
            print(f"⚠️ Could not check egress status: {status_error}")
            egress_status = None
        
        # Only try to stop if egress is active/starting (not already failed/completed)
        if egress_status and egress_status in [api.EgressStatus.EGRESS_FAILED, api.EgressStatus.EGRESS_COMPLETE]:
            print(f"ℹ️ Egress already in final state ({egress_status}), skipping stop call")
        else:
            # Stop the egress
            try:
                await lk_api.egress.stop_egress(api.StopEgressRequest(egress_id=egress_id))
                print(f"✅ Egress stopped successfully!")
                print(f"   Egress ID: {egress_id}")
                print(f"   Room: {room_name}")
            except Exception as stop_error:
                error_str = str(stop_error)
                # Handle TwirpError for failed/completed egress
                if "EGRESS_FAILED" in error_str or "cannot be stopped" in error_str or "failed_precondition" in error_str:
                    print(f"ℹ️ Egress already failed/completed, cannot stop: {error_str}")
                    print(f"ℹ️ Continuing to try getting file URL...")
                    # Continue to try getting the file URL even if stop failed
                else:
                    print(f"⚠️ Unexpected error stopping egress: {error_str}")
                    # Still try to get file URL even on unexpected errors
        
        # Get filename from stored egress info
        filename = egress_info.get("filename")
        recording_url = None
        
        # Generate signed URL for private bucket
        # Note: File might not be uploaded immediately, so we retry with delays
        if filename:
            service_client = get_service_role_client()
            recording_url = None
            max_retries = 5
            retry_delay = 2  # seconds
            
            for attempt in range(max_retries):
                try:
                    # Wait a bit before first attempt (file might still be uploading)
                    if attempt > 0:
                        await asyncio.sleep(retry_delay)
                        print(f"🔄 Retrying signed URL generation (attempt {attempt + 1}/{max_retries})...")
                    
                    # Create signed URL valid for 7 days (604800 seconds)
                    signed_url_response = service_client.storage.from_(SUPABASE_BUCKET).create_signed_url(
                        filename, 
                        604800  # 7 days expiration
                    )
                    
                    print(f"🔍 Signed URL response type: {type(signed_url_response)}")
                    print(f"🔍 Signed URL response: {signed_url_response}")
                    
                    # Check response format - could be dict with signedURL or direct string
                    if signed_url_response:
                        if isinstance(signed_url_response, dict):
                            if not signed_url_response.get("error"):
                                recording_url = signed_url_response.get("signedURL") or signed_url_response.get("url") or signed_url_response.get("signed_url")
                                if recording_url:
                                    # Verify URL has token parameter
                                    if "token=" in recording_url or "?" in recording_url:
                                        print(f"📁 Generated signed URL for recording: {recording_url[:150]}...")
                                        break
                                    else:
                                        print(f"⚠️ Signed URL missing token parameter: {recording_url[:100]}...")
                                        if attempt < max_retries - 1:
                                            print(f"⚠️ Will retry...")
                                        else:
                                            print(f"⚠️ URL format incorrect after {max_retries} attempts")
                            else:
                                error_msg = signed_url_response.get("error", "Unknown error")
                                if attempt < max_retries - 1:
                                    print(f"⚠️ File not found yet (attempt {attempt + 1}), will retry... Error: {error_msg}")
                                else:
                                    print(f"⚠️ Failed to generate signed URL after {max_retries} attempts: {error_msg}")
                        elif isinstance(signed_url_response, str):
                            # Direct URL string
                            recording_url = signed_url_response
                            if "token=" in recording_url or "?" in recording_url:
                                print(f"📁 Generated signed URL for recording: {recording_url[:150]}...")
                                break
                            else:
                                print(f"⚠️ Signed URL string missing token parameter")
                                if attempt < max_retries - 1:
                                    print(f"⚠️ Will retry...")
                                else:
                                    print(f"⚠️ URL format incorrect after {max_retries} attempts")
                    else:
                        error_msg = signed_url_response.get("error", "Unknown error") if signed_url_response else "No response"
                        if attempt < max_retries - 1:
                            print(f"⚠️ File not found yet (attempt {attempt + 1}), will retry... Error: {error_msg}")
                        else:
                            print(f"⚠️ Failed to generate signed URL after {max_retries} attempts: {error_msg}")
                            
                except Exception as url_error:
                    error_str = str(url_error)
                    # Check if it's a "not found" error (file still uploading)
                    if "not found" in error_str.lower() or "404" in error_str or "not_found" in error_str.lower():
                        if attempt < max_retries - 1:
                            print(f"⚠️ File not found yet (attempt {attempt + 1}), will retry in {retry_delay}s...")
                        else:
                            print(f"⚠️ File not found after {max_retries} attempts. File might still be uploading.")
                    else:
                        print(f"⚠️ Error generating signed URL: {url_error}")
                        import traceback
                        traceback.print_exc()
                        break
            
            # If signed URL generation failed, try public URL as fallback
            if not recording_url:
                base_url = SUPABASE_S3_URL.replace("/storage/v1/s3", "")
                recording_url = f"{base_url}/storage/v1/object/public/{SUPABASE_BUCKET}/{filename}"
                print(f"📁 Using public URL fallback (file may still be uploading): {recording_url}")
                print(f"💡 Note: If file is in private bucket, you may need to wait a few seconds and try accessing the URL again.")
        
        # Remove from active egresses
        del active_egresses[room_name]
        
        return {
            "success": True,
            "egress_id": egress_id,
            "room_name": room_name,
            "status": "stopped",
            "recording_url": recording_url,
            "filename": filename,
            "expires_in": 604800 if recording_url else None  # 7 days in seconds
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