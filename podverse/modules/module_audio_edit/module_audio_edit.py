from fastapi import APIRouter, Depends, HTTPException, UploadFile, Form
from fastapi.responses import JSONResponse, FileResponse
from connection_supabase_client import get_authenticated_supabase_client, get_service_role_client
import os
import ffmpeg

router = APIRouter()


@router.get("/stock-audio/")
async def get_stock_audio_files(auth_data: dict = Depends(get_authenticated_supabase_client)):
    """
    Fetch all audio files from the sounds table
    """
    
    user_id = auth_data["user_id"]
        
    try:
        # Use service role client for database operations
        service_client = get_service_role_client()
        
        # Query the sounds table
        response = service_client.table("sounds").select("*").execute()
        
        if not response.data or len(response.data) == 0:
            return JSONResponse(content={
                "error": "No audio files found in the sounds table.",
                "user_id": user_id
            }, status_code=404)
        
        # Organize files by category
        organized_files = {
            "ambient": [],
            "audience": [],
            "music": [],
            "transitions": []
        }
        
        print(f"Processing {len(response.data)} files from sounds table...")
        
        for sound in response.data:
            # Create a clean display name from the name field
            display_name = sound["name"].replace("_", " ").title()
            
            # Format file size
            size_mb = round(float(sound["size"]), 2)
            
            # Convert duration to float
            duration = float(sound["duration"]) if sound["duration"] else 0
            
            file_data = {
                "id": sound["id"],  # Use UUID as ID
                "name": display_name,
                "filename": sound["name"],
                "category": sound["category"],
                "size": f"{size_mb} MB",
                "duration": duration,  # Duration is already in the table
                "created_at": sound["created_at"],
                "mimetype": sound["mimetype"],
                "path": sound["path"]  # Include path for audio URL generation
            }
            
            category = sound["category"]
            if category in organized_files:
                organized_files[category].append(file_data)
            else:
                # If category not in our predefined list, add it
                if category not in organized_files:
                    organized_files[category] = []
                organized_files[category].append(file_data)
        
        return JSONResponse(content={
            "success": True,
            "data": organized_files,
            "total_files": len(response.data)
        })
        
    except Exception as e:
        print(f"Error fetching stock audio files: {e}")
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/audio-url/{sound_id}")
async def get_audio_url(
    sound_id: str,
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """
    Get signed URL for audio file using sound ID from sounds table
    """
    try:
        service_client = get_service_role_client()

        # First, get the path from the sounds table using the sound ID
        sound_response = service_client.table("sounds").select("path").eq("id", sound_id).execute()
        
        if not sound_response.data or len(sound_response.data) == 0:
            raise HTTPException(status_code=404, detail="Sound not found")

        file_path = sound_response.data[0]["path"]

        # Generate signed URL using the path from the table (7 days = 604800 seconds)
        response = service_client.storage.from_("sounds").create_signed_url(
            file_path, 
            604800  # 7 days instead of 1 hour
        )
        if response.get("error"):
            raise HTTPException(status_code=404, detail="File not found in storage")

        return JSONResponse(content={
            "success": True,
            "url": response.get("signedURL"),
            "expires_in": 3600
        })
        
    except Exception as e:
        print(f"Error getting audio URL: {e}")
        return JSONResponse(content={"error": str(e)}, status_code=500)


# -------- AUDIO EDITING ENDPOINTS --------

# Create a temp directory to store edited audio
TEMP_DIR = "temp_audio"
os.makedirs(TEMP_DIR, exist_ok=True)

# Helper functions using ffmpeg-python

def split_audio(input_path: str, start_time: float, duration: float, output_name: str):
    output_path = os.path.join(TEMP_DIR, output_name)
    try:
        (
            ffmpeg
            .input(input_path, ss=start_time, t=duration)
            .output(output_path)
            .overwrite_output()
            .run(quiet=True)
        )
        return output_path
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error splitting audio: {e}")

def change_speed(input_path: str, speed: float, output_name: str):
    output_path = os.path.join(TEMP_DIR, output_name)
    
    # Limit speed to maximum 2.0x
    speed = min(speed, 2.0)
    speed = max(speed, 0.25)
    
    try:
        stream = ffmpeg.input(input_path)
        
        if speed < 0.5:
            remaining_speed = speed
            while remaining_speed < 0.5:
                stream = stream.filter("atempo", 0.5)
                remaining_speed *= 2
            if remaining_speed != 1.0:
                stream = stream.filter("atempo", remaining_speed)
        elif speed > 2.0:
            remaining_speed = speed
            while remaining_speed > 2.0:
                stream = stream.filter("atempo", 2.0)
                remaining_speed /= 2
            if remaining_speed != 1.0:
                stream = stream.filter("atempo", remaining_speed)
        else:
            stream = stream.filter("atempo", speed)
        
        (
            stream
            .output(output_path, acodec='pcm_s16le', ar='44100')
            .overwrite_output()
            .run(capture_stdout=True, capture_stderr=True, quiet=True)
        )
        return output_path
    except ffmpeg.Error as e:
        error_message = e.stderr.decode() if e.stderr else str(e)
        print(f"FFmpeg error: {error_message}")
        raise HTTPException(status_code=500, detail=f"Error changing playback speed: {error_message}")
    except Exception as e:
        print(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=f"Error changing playback speed: {e}")

def change_volume(input_path: str, volume_factor: float, output_name: str):
    output_path = os.path.join(TEMP_DIR, output_name)
    
    print(f"Processing volume: input={input_path}, factor={volume_factor}, output={output_name}")
    
    try:
        # Ensure output filename has .wav extension
        if not output_path.endswith('.wav'):
            output_path = output_path.replace(os.path.splitext(output_path)[1], '.wav')
        
        (
            ffmpeg
            .input(input_path)
            .filter("volume", volume_factor)
            .output(output_path, acodec='pcm_s16le', ar='44100')  # Force WAV format
            .overwrite_output()
            .run(capture_stdout=True, capture_stderr=True)
        )
        
        print(f"Volume adjustment successful: {output_path}")
        return output_path
        
    except ffmpeg.Error as e:
        error_msg = e.stderr.decode() if e.stderr else str(e)
        print(f"FFmpeg Error: {error_msg}")
        raise HTTPException(status_code=500, detail=f"Error adjusting volume: {error_msg}")
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error adjusting volume: {str(e)}")

def export_audio(input_path: str, format: str, output_name: str):
    output_path = os.path.join(TEMP_DIR, f"{output_name}.{format}")
    try:
        (
            ffmpeg
            .input(input_path)
            .output(output_path)
            .overwrite_output()
            .run(quiet=True)
        )
        return output_path
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting audio: {e}")


@router.post("/split")
async def split_audio_api(file: UploadFile, start_time: float = Form(...), duration: float = Form(...)):
    """
    Split an audio file between given start_time and duration
    """
    input_path = os.path.join(TEMP_DIR, file.filename)
    with open(input_path, "wb") as f:
        f.write(await file.read())

    output_path = split_audio(input_path, start_time, duration, f"split_{file.filename}")
    return FileResponse(output_path, filename=os.path.basename(output_path))


@router.post("/speed")
async def change_speed_api(file: UploadFile, speed: float = Form(...)):
    """
    Change playback speed of the uploaded audio
    """
    input_path = os.path.join(TEMP_DIR, file.filename)
    with open(input_path, "wb") as f:
        f.write(await file.read())

    output_path = change_speed(input_path, speed, f"speed_{file.filename}")
    return FileResponse(output_path, filename=os.path.basename(output_path))


@router.post("/volume")
async def change_volume_api(file: UploadFile, volume: float = Form(...)):
    """
    Adjust volume of the uploaded audio
    """
    print(f"Received volume change request: volume={volume}, filename={file.filename}")
    
    input_path = os.path.join(TEMP_DIR, file.filename)
    
    try:
        # Save the uploaded file
        file_content = await file.read()
        print(f"File size: {len(file_content)} bytes")
        
        with open(input_path, "wb") as f:
            f.write(file_content)
        
        print(f"File saved to: {input_path}")
        
        # Check if file exists and is valid
        if not os.path.exists(input_path):
            raise HTTPException(status_code=500, detail="Failed to save input file")
        
        # Process the audio
        output_path = change_volume(input_path, volume, f"volume_{file.filename}")
        
        print(f"Successfully processed. Output: {output_path}")
        return FileResponse(output_path, filename=os.path.basename(output_path))
        
    except Exception as e:
        print(f"ERROR in change_volume_api: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error adjusting volume: {str(e)}")


@router.post("/export")
async def export_audio_api(file: UploadFile, format: str = Form(...)):
    """
    Export audio into a different format (e.g., wav, mp3, ogg)
    """
    input_path = os.path.join(TEMP_DIR, file.filename)
    with open(input_path, "wb") as f:
        f.write(await file.read())

    output_name = os.path.splitext(file.filename)[0]
    output_path = export_audio(input_path, format, f"exported_{output_name}")
    return FileResponse(output_path, filename=os.path.basename(output_path))

