from fastapi import APIRouter, Depends, HTTPException, UploadFile, Form
from fastapi.responses import JSONResponse, FileResponse
from connection_supabase_client import get_authenticated_supabase_client, get_service_role_client
import os
import re
import time
import ffmpeg
import subprocess

router = APIRouter()

# ---------------- STOCK AUDIO FETCHING ----------------

@router.get("/stock-audio/")
async def get_stock_audio_files(auth_data: dict = Depends(get_authenticated_supabase_client)):
    """
    Fetch all audio files from the sounds table
    """
    user_id = auth_data["user_id"]

    try:
        service_client = get_service_role_client()
        response = service_client.table("sounds").select("*").execute()

        if not response.data or len(response.data) == 0:
            return JSONResponse(content={"error": "No audio files found.", "user_id": user_id}, status_code=404)

        organized_files = {"ambient": [], "audience": [], "music": [], "transitions": []}

        for sound in response.data:
            display_name = sound["name"].replace("_", " ").title()
            size_mb = round(float(sound["size"]), 2)
            duration = float(sound["duration"]) if sound["duration"] else 0

            file_data = {
                "id": sound["id"],
                "name": display_name,
                "filename": sound["name"],
                "category": sound["category"],
                "size": f"{size_mb} MB",
                "duration": duration,
                "created_at": sound["created_at"],
                "mimetype": sound["mimetype"],
                "path": sound["path"]
            }

            organized_files.setdefault(sound["category"], []).append(file_data)

        return JSONResponse(content={"success": True, "data": organized_files, "total_files": len(response.data)})

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------- AUDIO URL ----------------

@router.get("/audio-url/{sound_id}")
async def get_audio_url(sound_id: str, auth_data: dict = Depends(get_authenticated_supabase_client)):
    """
    Get signed URL for audio file using sound ID
    """
    try:
        service_client = get_service_role_client()
        sound_response = service_client.table("sounds").select("path").eq("id", sound_id).execute()

        if not sound_response.data:
            raise HTTPException(status_code=404, detail="Sound not found")

        file_path = sound_response.data[0]["path"]
        response = service_client.storage.from_("sounds").create_signed_url(file_path, 604800)

        if response.get("error"):
            raise HTTPException(status_code=404, detail="File not found in storage")

        return JSONResponse(content={"success": True, "url": response.get("signedURL"), "expires_in": 3600})

    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)


# ---------------- AUDIO EDITING ----------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMP_DIR = os.path.join(BASE_DIR, "temp_audio")
os.makedirs(TEMP_DIR, exist_ok=True)


def sanitize_filename(filename: str, fallback: str = "audio_input.wav") -> str:
    """
    Remove query params, directories, and unsupported characters from filenames.
    """
    if not filename:
        return fallback
    base_name = filename.split("?")[0]
    base_name = os.path.basename(base_name)
    safe_name = re.sub(r'[^A-Za-z0-9._-]', '_', base_name)
    return safe_name or fallback


def split_audio(input_path: str, start_time: float, duration: float, output_name: str):
    output_path = os.path.join(TEMP_DIR, output_name)
    try:
        ffmpeg.input(input_path, ss=start_time, t=duration).output(output_path).overwrite_output().run(quiet=True)
        return output_path
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error splitting audio: {e}")


def change_speed(input_path: str, speed: float, output_name: str):
    output_path = os.path.join(TEMP_DIR, output_name)
    speed = max(0.25, min(speed, 2.0))
    try:
        stream = ffmpeg.input(input_path).filter("atempo", speed)
        stream.output(output_path, acodec='pcm_s16le', ar='44100').overwrite_output().run(quiet=True)
        return output_path
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error changing speed: {e}")


def change_volume(input_path: str, volume_factor: float, output_name: str):
    output_path = os.path.join(TEMP_DIR, output_name)
    try:
        ffmpeg.input(input_path).filter("volume", volume_factor).output(output_path, acodec='pcm_s16le', ar='44100').overwrite_output().run(quiet=True)
        return output_path
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adjusting volume: {e}")


def export_audio(input_path: str, format: str, output_name: str):
    output_path = os.path.join(TEMP_DIR, f"{output_name}.{format}")
    try:
        ffmpeg.input(input_path).output(output_path).overwrite_output().run(quiet=True)
        return output_path
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting audio: {e}")


# ---------------- AUDIO API ROUTES ----------------

@router.post("/split")
async def split_audio_api(file: UploadFile, start_time: float = Form(...), duration: float = Form(...)):
    safe_name = sanitize_filename(file.filename, "uploaded_audio.wav")
    input_path = os.path.join(TEMP_DIR, safe_name)
    with open(input_path, "wb") as f:
        f.write(await file.read())
    output_filename = sanitize_filename(f"split_{safe_name}", f"split_{safe_name}")
    output_path = split_audio(input_path, start_time, duration, output_filename)
    return FileResponse(output_path, filename=os.path.basename(output_path))


@router.post("/speed")
async def change_speed_api(file: UploadFile, speed: float = Form(...)):
    safe_name = sanitize_filename(file.filename, "uploaded_audio.wav")
    input_path = os.path.join(TEMP_DIR, safe_name)
    with open(input_path, "wb") as f:
        f.write(await file.read())
    output_filename = sanitize_filename(f"speed_{safe_name}", f"speed_{safe_name}")
    output_path = change_speed(input_path, speed, output_filename)
    return FileResponse(output_path, filename=os.path.basename(output_path))


@router.post("/volume")
async def change_volume_api(file: UploadFile, volume: float = Form(...)):
    safe_name = sanitize_filename(file.filename, "uploaded_audio.wav")
    input_path = os.path.join(TEMP_DIR, safe_name)
    with open(input_path, "wb") as f:
        f.write(await file.read())
    output_filename = sanitize_filename(f"volume_{safe_name}", f"volume_{safe_name}")
    output_path = change_volume(input_path, volume, output_filename)
    return FileResponse(output_path, filename=os.path.basename(output_path))


@router.post("/export")
async def export_audio_api(file: UploadFile, format: str = Form(...)):
    safe_name = sanitize_filename(file.filename, "uploaded_audio.wav")
    input_path = os.path.join(TEMP_DIR, safe_name)
    with open(input_path, "wb") as f:
        f.write(await file.read())
    output_name = os.path.splitext(safe_name)[0]
    output_path = export_audio(input_path, format, f"exported_{output_name}")
    return FileResponse(output_path, filename=os.path.basename(output_path))


@router.post("/merge_audio/")
async def merge_audio(files: list[UploadFile]):
    """
    Merge multiple audio files into one combined track.
    """
    try:
        # Save uploaded files temporarily
        temp_paths = []
        for index, file in enumerate(files):
            base_name = sanitize_filename(file.filename, f"merge_{index}.wav")
            unique_name = f"{int(time.time() * 1000)}_{base_name}"
            file_path = os.path.join(TEMP_DIR, unique_name)
            with open(file_path, "wb") as f:
                f.write(await file.read())
            temp_paths.append(file_path)

        # Create list.txt for FFmpeg concat
        list_file = os.path.join(TEMP_DIR, "list.txt")
        with open(list_file, "w") as f:
            for path in temp_paths:
                abs_path = os.path.abspath(path).replace('\\', '/')
                f.write(f"file '{abs_path}'\n")

        output_path = os.path.join(TEMP_DIR, "merged_output.wav")

        # Merge and re-encode to uniform audio format
        subprocess.run([
            "ffmpeg", "-f", "concat", "-safe", "0", "-i", list_file,
            "-acodec", "pcm_s16le", "-ar", "44100", "-ac", "2",  # ✅ Force re-encode
            "-y", output_path
        ], check=True)

        return FileResponse(output_path, filename="merged_output.wav")

    except subprocess.CalledProcessError as e:
        print(f"❌ FFmpeg merge failed: {e}")
        raise HTTPException(status_code=500, detail="Error merging audio files")
    except Exception as e:
        print(f"❌ Error during audio merge: {e}")
        raise HTTPException(status_code=500, detail=str(e))
