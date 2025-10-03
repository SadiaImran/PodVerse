from fastapi import APIRouter, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from typing import List
from uuid import uuid4
import os
from connection_supabase_client import get_authenticated_supabase_client, get_service_role_client

router = APIRouter()

# Create directories
UPLOAD_DIR = "audio"
OUTPUT_DIR = "output"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

@router.post("/voice-clone/")
async def voice_clone_upload(file_upload: List[UploadFile], text: str = Form(...)):
    try:
        file_names = []
        file_paths = []

        for file in file_upload:
            data = await file.read()
            save_to = os.path.join(UPLOAD_DIR, file.filename)
            file_paths.append(save_to)

            with open(save_to, "wb") as f:
                f.write(data)
            file_names.append(file.filename)

        output_filename = f"{uuid4().hex}_cloned_output.wav"
        output_path = os.path.join(OUTPUT_DIR, output_filename)

        # For now, create a dummy file (you can add actual voice cloning later)
        with open(output_path, "wb") as f:
            f.write(b"dummy audio data")

        return JSONResponse({
            "output_audio": f"/output/{output_filename}"
        })
        
    except Exception as e:
        return JSONResponse(
            {"error": f"Voice cloning failed: {str(e)}"}, 
            status_code=500
        )