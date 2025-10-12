from fastapi import APIRouter, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from typing import List
from uuid import uuid4
import os
import tempfile
import shutil
import time
from connection_supabase_client import get_authenticated_supabase_client, get_service_role_client

# Try to import audio processing libraries
try:
    import librosa
    import soundfile as sf
    AUDIO_PROCESSING_AVAILABLE = True
    print("✅ Audio processing libraries available")
except ImportError:
    AUDIO_PROCESSING_AVAILABLE = False
    print("⚠️ Audio processing libraries not available - install librosa and soundfile for better compatibility")

router = APIRouter()

# Create directories - simple approach
UPLOAD_DIR = "module_voice_clone/audio"
OUTPUT_DIR = "module_voice_clone/output"
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

import threading

def get_tts_model():
    """Lazy loading of TTS model - only loads when first needed"""
    global tts_model
    if tts_model is None:
        print("Loading TTS model...")
        tts_model = TTS("tts_models/multilingual/multi-dataset/xtts_v2", gpu=use_gpu, progress_bar=False)
        print("TTS model loaded successfully!")
    return tts_model

def preload_tts_model():
    get_tts_model()

# Server start pe call karo:
threading.Thread(target=preload_tts_model, daemon=True).start()

def convert_audio_format(input_path: str, output_path: str = None):
    """Convert audio file to WAV format for TTS compatibility"""
    if not AUDIO_PROCESSING_AVAILABLE:
        print(f"⚠️ No audio processing libraries - trying original format: {os.path.basename(input_path)}")
        return input_path  # Return original if no processing available
    
    try:
        if output_path is None:
            output_path = input_path.replace('.wav', '_converted.wav')
        
        # Load audio with librosa (handles many formats)
        audio_data, sample_rate = librosa.load(input_path, sr=22050)  # TTS prefers 22050 Hz
        
        # Save as WAV with soundfile
        sf.write(output_path, audio_data, sample_rate, format='WAV', subtype='PCM_16')
        
        print(f"✅ Converted audio: {os.path.basename(input_path)} → {os.path.basename(output_path)}")
        return output_path
        
    except Exception as e:
        print(f"⚠️ Audio conversion failed: {e}")
        return input_path  # Return original if conversion fails

def clone_voice(text_input: str, speaker_paths: list[str], output_path: str):
    tts = get_tts_model()  # Get the model when needed
    
    # Convert audio files to compatible format
    converted_paths = []
    for speaker_path in speaker_paths:
        converted_path = convert_audio_format(speaker_path)
        converted_paths.append(converted_path)
    
    tts.tts_to_file(
        text=text_input,
        speaker_wav=converted_paths,
        file_path=output_path,
        split_sentences=True,
        language="en" 
    )
    
    # Clean up converted files if they're different from original
    for i, converted_path in enumerate(converted_paths):
        if converted_path != speaker_paths[i]:
            try:
                os.remove(converted_path)
                print(f"🧹 Cleaned up converted file: {os.path.basename(converted_path)}")
            except:
                pass

def clone_voice_memory(text_input: str, audio_data_list: list[bytes], output_path: str):
    """Clone voice using audio data directly from memory (no temp files)"""
    tts = get_tts_model()
    
    # Create temporary files only for TTS processing
    temp_files = []
    try:
        for i, audio_data in enumerate(audio_data_list):
            temp_file = tempfile.NamedTemporaryFile(
                suffix=f"_temp_{i}.wav", 
                delete=False
            )
            temp_file.write(audio_data)
            temp_file.close()
            temp_files.append(temp_file.name)
        
        # Process with TTS
        tts.tts_to_file(
            text=text_input,
            speaker_wav=temp_files,
            file_path=output_path,
            split_sentences=True,
            language="en"
        )
        
    finally:
        # Clean up temp files
        for temp_file in temp_files:
            try:
                os.unlink(temp_file)
            except:
                pass



@router.post("/")
async def voice_clone_upload(file_upload: List[UploadFile], text: str = Form(...)):
    """Simple voice cloning - save output only, no upload file storage"""
    try:
        print(f"🎤 Voice clone request: {len(file_upload)} files, text: '{text[:50]}...'")
        
        if not file_upload:
            return JSONResponse(
                {"error": "No audio files provided"}, 
                status_code=400
            )
        
        file_paths = []

        # Save uploaded files temporarily for processing
        for file in file_upload:
            print(f"📁 Processing: {file.filename}")
            data = await file.read()
            
            # Ensure proper file extension for audio files
            filename = file.filename
            if not filename.lower().endswith(('.wav', '.mp3', '.m4a', '.flac')):
                filename = filename + '.wav'
            
            save_to = os.path.join(UPLOAD_DIR, filename)
            
            with open(save_to, "wb") as f:
                f.write(data)
            file_paths.append(save_to)
            print(f"✅ Saved: {filename}")

        # Generate output filename
        output_filename = f"{uuid4().hex}_cloned_output.wav"
        output_path = os.path.join(OUTPUT_DIR, output_filename)
        print(f"🎯 Output: {output_filename}")

        # Voice cloning
        print("🎤 Starting voice cloning...")
        clone_voice(text, file_paths, output_path)
        print("✅ Voice cloning completed!")

        # Verify output file was created
        if os.path.exists(output_path):
            file_size = os.path.getsize(output_path)
            print(f"✅ Output file created: {output_filename} ({file_size} bytes)")
        else:
            print(f"❌ Output file not found: {output_path}")
            return JSONResponse(
                {"error": "Output file was not created"}, 
                status_code=500
            )

        # Clean up uploaded files immediately after processing
        for file_path in file_paths:
            try:
                os.remove(file_path)
                print(f"🧹 Cleaned up: {os.path.basename(file_path)}")
            except Exception as e:
                print(f"⚠️ Error cleaning {file_path}: {e}")

        return JSONResponse({
            "output_audio": f"/output/{output_filename}",
            "message": "Voice cloning successful!",
            "file_size": file_size
        })
        
    except Exception as e:
        print(f"❌ Voice cloning error: {str(e)}")
        return JSONResponse(
            {"error": f"Voice cloning failed: {str(e)}"}, 
            status_code=500
        )

@router.get("/status")
def voice_clone_status():
    global tts_model
    return {"ready": tts_model is not None}

@router.get("/test")
def test_endpoint():
    return {"message": "Voice clone router is working!", "status": "ok"}

@router.get("/health")
def health_check():
    """Health check endpoint to verify server status"""
    global tts_model
    return {
        "status": "healthy",
        "tts_model_loaded": tts_model is not None,
        "timestamp": time.time(),
        "message": "Voice clone service is running"
    }

@router.get("/debug/files")
def debug_files():
    """Debug endpoint to check output directory contents"""
    try:
        files = []
        if os.path.exists(OUTPUT_DIR):
            for filename in os.listdir(OUTPUT_DIR):
                file_path = os.path.join(OUTPUT_DIR, filename)
                if os.path.isfile(file_path):
                    file_size = os.path.getsize(file_path)
                    files.append({
                        "name": filename,
                        "size": file_size,
                        "path": file_path
                    })
        
        return {
            "output_directory": OUTPUT_DIR,
            "directory_exists": os.path.exists(OUTPUT_DIR),
            "files": files,
            "file_count": len(files)
        }
    except Exception as e:
        return {"error": str(e)}


