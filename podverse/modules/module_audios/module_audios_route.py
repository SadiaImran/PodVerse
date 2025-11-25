from fastapi import APIRouter, UploadFile, Form, Depends, HTTPException, File
from fastapi.responses import FileResponse, JSONResponse
import subprocess, os, uuid
from connection_supabase_client import get_authenticated_supabase_client, get_service_role_client

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)


def run_ffmpeg(cmd: list[str]):
    """Run FFmpeg command safely"""
    process = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if process.returncode != 0:
        raise Exception(f"FFmpeg error: {process.stderr}")
    return process


@router.post("/trim")
async def trim_audio(file: UploadFile, start: float = Form(...), end: float = Form(...)):
    """Trim audio between start and end seconds"""
    input_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}_{file.filename}")
    output_path = os.path.join(OUTPUT_DIR, f"trimmed_{uuid.uuid4()}.mp3")

    with open(input_path, "wb") as f:
        f.write(await file.read())

    cmd = [
    "ffmpeg", "-y", 
    "-i", input_path,
    "-ss", str(start), "-to", str(end),
    "-c:a", "libmp3lame",  # ✅ Force re-encode to MP3
    output_path
]
    run_ffmpeg(cmd)

    return FileResponse(output_path, filename=os.path.basename(output_path))


@router.post("/merge")
async def merge_audios(files: list[UploadFile]):
    """Merge multiple audio files sequentially"""
    list_file = os.path.join(UPLOAD_DIR, f"list_{uuid.uuid4()}.txt")

    with open(list_file, "w") as f:
        for file in files:
            input_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}_{file.filename}")
            with open(input_path, "wb") as out:
                out.write(await file.read())
            f.write(f"file '{input_path}'\n")

    output_path = os.path.join(OUTPUT_DIR, f"merged_{uuid.uuid4()}.mp3")
    cmd = ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", list_file, "-c", "copy", output_path]
    run_ffmpeg(cmd)

    return FileResponse(output_path, filename=os.path.basename(output_path))


@router.post("/upload-edited-audio")
async def upload_edited_audio_to_supabase(
    file: UploadFile = File(...),
    user_id: str = Form(None),
    kb_id: str = Form(None),
    podcast_title: str = Form(None),
    original_recording_path: str = Form(None),  # Original recording path to overwrite
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """
    Upload edited audio to Supabase storage recordings bucket and return signed URL.
    If original_recording_path is provided, overwrites that file instead of creating new one.
    """
    try:
        service_client = get_service_role_client()
        authenticated_user_id = auth_data["user_id"]
        
        # Read file data
        file_data = await file.read()
        file_size = len(file_data)
        
        # Determine storage path
        if original_recording_path:
            # Overwrite original recording file
            storage_path = original_recording_path
            # Ensure .wav extension (convert from .ogg if needed)
            if storage_path.endswith('.ogg'):
                storage_path = storage_path[:-4] + '.wav'
            elif not storage_path.endswith('.wav'):
                storage_path = storage_path.rsplit('.', 1)[0] + '.wav' if '.' in storage_path else storage_path + '.wav'
            print(f"🔄 Overwriting original recording: {storage_path} ({file_size} bytes)")
        else:
            # Generate new filename: user_{user_id}_title_{title}_kb_{kb_id}_edited_{timestamp}.wav
            effective_user_id = user_id or authenticated_user_id or "unknown"
            effective_kb_id = kb_id or "kb_unknown"
            effective_title = podcast_title or "edited_audio"
            import time
            timestamp = int(time.time())
            safe_title = "".join(c for c in effective_title if c.isalnum() or c in (' ', '-', '_')).strip().replace(' ', '_')
            storage_path = f"user_{effective_user_id}_title_{safe_title}_kb_{effective_kb_id}_edited_{timestamp}.wav"
            print(f"📤 Uploading new edited audio to Supabase: {storage_path} ({file_size} bytes)")
        
        # Upload to Supabase Storage (recordings bucket)
        bucket_name = "recordings"
        try:
            # Fix: upsert should be a string "true" not boolean True
            service_client.storage.from_(bucket_name).upload(
                storage_path,
                file_data,
                {"content-type": "audio/wav", "upsert": "true"},
            )
            print(f"✅ Uploaded edited audio to Supabase: {storage_path}")
        except Exception as upload_error:
            print(f"⚠️ Failed to upload edited audio to Supabase: {upload_error}")
            raise HTTPException(status_code=500, detail=f"Failed to upload audio: {str(upload_error)}")
        
        # Generate signed URL (valid for 7 days = 604800 seconds)
        try:
            signed_url_response = service_client.storage.from_(bucket_name).create_signed_url(
                storage_path, 604800
            )
            
            print(f"🔍 Signed URL response type: {type(signed_url_response)}")
            print(f"🔍 Signed URL response: {signed_url_response}")
            
            signed_url = None
            if isinstance(signed_url_response, dict):
                # Check for error first
                if signed_url_response.get("error"):
                    error_msg = signed_url_response.get("error", "Unknown error")
                    print(f"⚠️ Signed URL response contains error: {error_msg}")
                    raise HTTPException(status_code=500, detail=f"Failed to generate signed URL: {error_msg}")
                
                # Try all possible keys (Supabase client might use different keys)
                signed_url = (
                    signed_url_response.get("signedURL")
                    or signed_url_response.get("signed_url")
                    or signed_url_response.get("url")
                    or signed_url_response.get("signedUrl")  # camelCase variant
                    or (signed_url_response.get("data") if isinstance(signed_url_response.get("data"), str) else None)
                )
                
                # If still None, print all keys for debugging
                if not signed_url:
                    print(f"⚠️ Could not find signed URL in response. Available keys: {list(signed_url_response.keys())}")
                    print(f"⚠️ Full response: {signed_url_response}")
            elif isinstance(signed_url_response, str):
                signed_url = signed_url_response
            else:
                print(f"⚠️ Unexpected signed URL response format: {type(signed_url_response)}")
                print(f"⚠️ Response value: {signed_url_response}")
                signed_url = None
            
            # Validate that signed URL has token parameter
            if signed_url:
                if "token=" not in signed_url and "?" not in signed_url:
                    print(f"⚠️ Signed URL missing token parameter: {signed_url[:100]}...")
                    # Try to regenerate or use public URL as fallback
                    raise HTTPException(status_code=500, detail="Generated signed URL is missing token parameter")
                
                print(f"🔗 Signed URL created for edited audio: {signed_url[:100]}...")
                return JSONResponse({
                    "success": True,
                    "audio_url": signed_url,
                    "storage_path": storage_path,
                    "message": "Edited audio uploaded successfully"
                })
            else:
                print(f"⚠️ Signed URL response was empty or None")
                raise HTTPException(status_code=500, detail="Failed to generate signed URL: Empty response")
        except HTTPException:
            raise
        except Exception as url_error:
            print(f"⚠️ Failed to create signed URL: {url_error}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Failed to generate signed URL: {str(url_error)}")
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error uploading edited audio: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error uploading audio: {str(e)}")
