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

from TTS.api import TTS
import os
import torch
from functools import partial

original_load = torch.load
torch.load = lambda *args, **kwargs: original_load(*args, **kwargs, weights_only=False)
use_gpu = torch.cuda.is_available()
print(f"GPU acceleration {'enabled' if use_gpu else 'disabled'}")

# Global variable to store the TTS model
tts_model = None

def get_tts_model():
    """Lazy loading of TTS model - only loads when first needed"""
    global tts_model
    if tts_model is None:
        print("Loading TTS model...")
        tts_model = TTS("tts_models/multilingual/multi-dataset/xtts_v2", gpu=use_gpu, progress_bar=False)
        print("TTS model loaded successfully!")
    return tts_model

def clone_voice(text_input: str, speaker_paths: list[str], output_path: str):
    tts = get_tts_model()  # Get the model when needed
    tts.tts_to_file(
        text=text_input,
        speaker_wav=speaker_paths,
        file_path=output_path,
        split_sentences=True,
        language="en" 
    )



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

        # Use the actual voice cloning function
        clone_voice(text, file_paths, output_path)

        return JSONResponse({
            "output_audio": f"/output/{output_filename}"
        })
        
    except Exception as e:
        return JSONResponse(
            {"error": f"Voice cloning failed: {str(e)}"}, 
            status_code=500
        )