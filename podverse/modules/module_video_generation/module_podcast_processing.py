"""
module_podcast_processing.py - WITH AUDIO INPUT SUPPORT

Key features:
1. Uses original speaker audio by default (preserves real voices)
2. Optionally override with HeyGen TTS voices
3. Uploads speaker audio files to HeyGen
4. Supports custom photo avatars
"""

import os
import json
import tempfile
from typing import Dict, List, Tuple, Optional
from dotenv import load_dotenv
from pydub import AudioSegment
import assemblyai as aai
from fastapi import APIRouter, HTTPException, BackgroundTasks, File, UploadFile, Form, Depends
from pydantic import BaseModel
import requests
import time
import subprocess 

# Import functions from your existing module_video.py
from .module_video import (
    HEYGEN_API_KEY,
    HEYGEN_BASE,
    HEYGEN_UPLOAD_BASE,
    HEADERS,
    verify_token,
    generate_video,
    video_status,
    get_upload_headers
)

# Load environment variables
load_dotenv()
aai.settings.api_key = os.environ.get("ASSEMBLYAI_API_KEY")

router = APIRouter()

# MODELS

class PodcastProcessRequest(BaseModel):
    """Request for processing podcast (when audio is separate)"""
    conversation_id: Optional[str] = None


class ProcessingStatus(BaseModel):
    """Status of podcast processing"""
    job_id: str
    status: str
    progress: int
    message: str
    speaker_a_video: Optional[str] = None
    speaker_b_video: Optional[str] = None
    merged_video: Optional[str] = None  # Add this
    speaker_a_video_id: Optional[str] = None
    speaker_b_video_id: Optional[str] = None
    transcript: Optional[List[Dict]] = None
    error: Optional[str] = None


# In-memory job tracking
processing_jobs: Dict[str, ProcessingStatus] = {}


import subprocess
from pathlib import Path

def create_dynamic_podcast_video(
    video_a_url: str,
    video_b_url: str,
    utterances: List[Dict],
    output_path: str
) -> str:
    """
    Create a dynamic podcast video that switches between speakers.
    
    Args:
        video_a_url: URL to Speaker A's video
        video_b_url: URL to Speaker B's video
        utterances: List of transcript utterances with timing
        output_path: Path to save the merged video
    
    Returns:
        Path to the merged video file
    """
    import tempfile
    import requests
    
    # Download both videos
    temp_dir = tempfile.gettempdir()
    video_a_path = os.path.join(temp_dir, "speaker_a_video.mp4")
    video_b_path = os.path.join(temp_dir, "speaker_b_video.mp4")
    
    print("📥 Downloading Speaker A video...")
    with open(video_a_path, 'wb') as f:
        f.write(requests.get(video_a_url).content)
    
    print("📥 Downloading Speaker B video...")
    with open(video_b_path, 'wb') as f:
        f.write(requests.get(video_b_url).content)
    
    # Build FFmpeg filter for switching between videos
    filter_complex = build_speaker_switch_filter(utterances, video_a_path, video_b_path)
    
    # Merge videos with FFmpeg
    print("🎬 Creating dynamic podcast video...")
    merged_path = os.path.join(temp_dir, f"podcast_merged_{int(time.time())}.mp4")
    
    ffmpeg_cmd = [
        'ffmpeg',
        '-i', video_a_path,
        '-i', video_b_path,
        '-filter_complex', filter_complex,
        '-map', '[outv]',
        '-map', '[outa]',
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-y',
        merged_path
    ]
    
    subprocess.run(ffmpeg_cmd, check=True, capture_output=True)
    
    print(f"✅ Merged video created: {merged_path}")
    
    # Cleanup
    os.remove(video_a_path)
    os.remove(video_b_path)
    
    return merged_path


def build_speaker_switch_filter(utterances: List[Dict], video_a: str, video_b: str) -> str:
    """
    Build FFmpeg filter_complex string for dynamic speaker switching.
    
    Creates segments and switches between videos based on who's speaking.
    """
    segments = []
    
    for i, utt in enumerate(utterances):
        speaker = utt["speaker"]
        start_sec = utt["start"] / 1000.0
        end_sec = utt["end"] / 1000.0
        duration = end_sec - start_sec
        
        # Select video input (0=A, 1=B)
        input_idx = 0 if speaker == "A" else 1
        
        segments.append({
            'input': input_idx,
            'start': start_sec,
            'duration': duration
        })
    
    # Build filter_complex for concatenation
    filter_parts = []
    
    for i, seg in enumerate(segments):
        input_idx = seg['input']
        start = seg['start']
        duration = seg['duration']
        
        # Trim video and audio
        filter_parts.append(
            f"[{input_idx}:v]trim=start={start}:duration={duration},setpts=PTS-STARTPTS[v{i}];"
            f"[{input_idx}:a]atrim=start={start}:duration={duration},asetpts=PTS-STARTPTS[a{i}]"
        )
    
    # Concatenate all segments
    video_inputs = ''.join([f"[v{i}]" for i in range(len(segments))])
    audio_inputs = ''.join([f"[a{i}]" for i in range(len(segments))])
    
    concat_filter = (
        f"{video_inputs}concat=n={len(segments)}:v=1:a=0[outv];"
        f"{audio_inputs}concat=n={len(segments)}:v=0:a=1[outa]"
    )
    
    return ";".join(filter_parts) + ";" + concat_filter


# SPEAKER DIARIZATION FUNCTIONS

def transcribe_and_diarize(audio_file: str) -> Tuple[List[Dict], Dict[str, str]]:
    """
    Transcribe audio with speaker diarization and split into separate files.
    
    Args:
        audio_file: Path to audio file
        
    Returns:
        Tuple of (utterances, audio_files)
        - utterances: List of {speaker, start, end, text}
        - audio_files: Dict mapping speaker label to audio file path
    """
    print("🎙️ Starting speaker diarization with AssemblyAI...")
    
    # Transcribe with speaker labels
    transcriber = aai.Transcriber()
    config = aai.TranscriptionConfig(
        speaker_labels=True,
        speakers_expected=2
    )
    
    print(f"📤 Transcribing: {audio_file}")
    transcript = transcriber.transcribe(audio_file, config)
    
    if transcript.status == aai.TranscriptStatus.error:
        raise Exception(f"Transcription failed: {transcript.error}")
    
    print("✅ Transcription complete!")
    
    # Build utterances data
    utterances = []
    for utt in transcript.utterances:
        utterances.append({
            "speaker": utt.speaker,
            "start": utt.start,
            "end": utt.end,
            "text": utt.text
        })
        print(f"  {utt.speaker} ({utt.start//1000}s): {utt.text[:50]}...")
    
    # Split audio by speaker
    print("\n🎧 Splitting audio by speaker...")
    audio = AudioSegment.from_file(audio_file)
    audio_files = {}
    
    for speaker_label in ["A", "B"]:
        segments = [u for u in utterances if u["speaker"] == speaker_label]
        
        if not segments:
            print(f"⚠️ No segments for Speaker {speaker_label}")
            continue
        
        speaker_audio = AudioSegment.empty()
        for seg in segments:
            start_ms = min(int(seg["start"]), len(audio))
            end_ms = min(int(seg["end"]), len(audio))
            if start_ms < end_ms:
                speaker_audio += audio[start_ms:end_ms]
        
        if len(speaker_audio) > 0:
            # Export as WAV for HeyGen
            out_path = os.path.join(tempfile.gettempdir(), f"speaker_{speaker_label}.wav")
            speaker_audio.export(out_path, format="wav")
            audio_files[speaker_label] = out_path
            duration = len(speaker_audio) / 1000
            print(f"✅ Exported Speaker {speaker_label}: {duration:.1f}s")
    
    return utterances, audio_files


def upload_audio_to_heygen(audio_file_path: str) -> str:
    """
    Upload audio file to HeyGen and return asset_id.
    
    Args:
        audio_file_path: Path to audio file
        
    Returns:
        asset_id: HeyGen asset ID for the uploaded audio
    """
    print(f"📤 Uploading audio to HeyGen: {audio_file_path}")
    
    with open(audio_file_path, 'rb') as f:
        file_content = f.read()
    
    # WAV files should use audio/x-wav
    content_type = 'audio/x-wav'
    upload_headers = get_upload_headers(content_type)
    upload_url = f"{HEYGEN_UPLOAD_BASE}/v1/asset"
    
    try:
        resp = requests.post(
            upload_url,
            headers=upload_headers,
            data=file_content,
            timeout=60
        )
        
        print(f"📊 Upload response status: {resp.status_code}")
        
        if resp.status_code != 200:
            print(f"❌ Upload failed: {resp.text[:500]}")
            raise Exception(f"Failed to upload audio: {resp.text[:200]}")
        
        resp_data = resp.json()
        asset_id = (
            resp_data.get("data", {}).get("asset_id") or
            resp_data.get("data", {}).get("id") or
            resp_data.get("asset_id") or
            resp_data.get("id")
        )
        
        if not asset_id:
            raise Exception(f"Asset ID not found in response: {resp_data}")
        
        print(f"✅ Audio uploaded, asset_id: {asset_id}")
        return asset_id
        
    except Exception as e:
        print(f"❌ Error uploading audio: {e}")
        raise


def get_speaker_text(utterances: List[Dict], speaker_label: str, max_chars: int = 800) -> str:
    """
    Extract and combine text for a specific speaker.
    Truncates if exceeds max_chars (for HeyGen free plan).
    """
    texts = [u["text"] for u in utterances if u["speaker"] == speaker_label]
    combined = " ".join(texts)
    
    if len(combined) > max_chars:
        print(f"⚠️ Speaker {speaker_label} text too long ({len(combined)} chars), truncating to {max_chars}")
        # Truncate at sentence boundary
        sentences = combined[:max_chars].split('. ')
        combined = '. '.join(sentences[:-1]) + '.'
    
    return combined


def update_job_status(job_id: str, **kwargs):
    """Update processing job status"""
    if job_id not in processing_jobs:
        return
    
    job = processing_jobs[job_id]
    for key, value in kwargs.items():
        if hasattr(job, key) and value is not None:
            setattr(job, key, value)



# BACKGROUND PROCESSING

def process_podcast_background(
    job_id: str,
    audio_file_path: str,
    speaker_a_avatar: str,
    speaker_a_voice: Optional[str],  # Optional now
    speaker_b_avatar: str,
    speaker_b_voice: Optional[str],  # Optional now
    is_custom_avatar_a: bool,
    is_custom_avatar_b: bool,
    use_original_voice_a: bool,  # New parameter
    use_original_voice_b: bool,  # New parameter
    authorization: str
):
    """
    Background task to process podcast audio into avatar videos.
    Uses original speaker audio by default, or HeyGen TTS if voice_id provided.
    """
    temp_files = [audio_file_path]
    
    try:
        # Step 1: Diarization
        update_job_status(job_id, status="diarizing", progress=20, message="Running speaker diarization...")
        
        utterances, audio_files = transcribe_and_diarize(audio_file_path)
        temp_files.extend(audio_files.values())
        
        # Step 2: Upload speaker audio files to HeyGen (if using original voices)
        update_job_status(job_id, progress=35, message="Uploading speaker audio files...")
        
        audio_asset_id_a = None
        audio_asset_id_b = None
        
        if use_original_voice_a and "A" in audio_files:
            audio_asset_id_a = upload_audio_to_heygen(audio_files["A"])
            print(f"✅ Speaker A audio uploaded: {audio_asset_id_a}")
        
        if use_original_voice_b and "B" in audio_files:
            audio_asset_id_b = upload_audio_to_heygen(audio_files["B"])
            print(f"✅ Speaker B audio uploaded: {audio_asset_id_b}")
        
        # Step 3: Extract text (for TTS fallback or reference)
        update_job_status(job_id, progress=45, message="Processing speaker scripts...")
        
        text_a = get_speaker_text(utterances, "A")
        text_b = get_speaker_text(utterances, "B")
        
        print(f"\n📝 Speaker A: {len(text_a)} characters")
        print(f"📝 Speaker B: {len(text_b)} characters")
        
        # Step 4: Generate videos
        update_job_status(job_id, status="generating_videos", progress=55, message="Generating Speaker A video...")
        
        from .module_video import GenerateRequest
        
        # Create request for Speaker A
        if use_original_voice_a and audio_asset_id_a:
            # Use original audio
            req_a = GenerateRequest(
                avatar_id=speaker_a_avatar,
                input_type="audio",
                audio_asset_id=audio_asset_id_a,
                is_custom_avatar=is_custom_avatar_a
            )
            print(f"🎤 Speaker A: Using original voice (audio asset)")
        else:
            # Use TTS
            req_a = GenerateRequest(
                avatar_id=speaker_a_avatar,
                voice_id=speaker_a_voice,
                input_text=text_a,
                input_type="text",
                is_custom_avatar=is_custom_avatar_a
            )
            print(f"🎤 Speaker A: Using HeyGen TTS voice")
        
        video_response_a = generate_video(req_a, authorization)
        video_id_a = video_response_a["video_id"]
        print(f"✅ Speaker A video started: {video_id_a}")
        
        update_job_status(
            job_id, 
            progress=65, 
            message="Generating Speaker B video...",
            speaker_a_video_id=video_id_a
        )
        
        # Create request for Speaker B
        if use_original_voice_b and audio_asset_id_b:
            # Use original audio
            req_b = GenerateRequest(
                avatar_id=speaker_b_avatar,
                input_type="audio",
                audio_asset_id=audio_asset_id_b,
                is_custom_avatar=is_custom_avatar_b
            )
            print(f"🎤 Speaker B: Using original voice (audio asset)")
        else:
            # Use TTS
            req_b = GenerateRequest(
                avatar_id=speaker_b_avatar,
                voice_id=speaker_b_voice,
                input_text=text_b,
                input_type="text",
                is_custom_avatar=is_custom_avatar_b
            )
            print(f"🎤 Speaker B: Using HeyGen TTS voice")
        
        video_response_b = generate_video(req_b, authorization)
        video_id_b = video_response_b["video_id"]
        print(f"✅ Speaker B video started: {video_id_b}")
        
        update_job_status(
            job_id,
            progress=75,
            message="Waiting for videos to render...",
            speaker_b_video_id=video_id_b
        )
        
        # Step 5: Poll for completion
        import time
        max_wait = 600  # 10 minutes
        start_time = time.time()
        
        video_url_a = None
        video_url_b = None
        
        while time.time() - start_time < max_wait:
            # Check video A
            if not video_url_a:
                try:
                    status_a = video_status(video_id_a, authorization)
                    if status_a["status"] == "completed":
                        video_url_a = status_a["video_url"]
                        print(f"✅ Speaker A video ready: {video_url_a}")
                        update_job_status(
                            job_id,
                            progress=87,
                            message="Speaker A ready, waiting for Speaker B...",
                            speaker_a_video=video_url_a
                        )
                    elif status_a["status"] == "failed":
                        raise Exception("Speaker A video generation failed")
                except Exception as e:
                    print(f"⚠️ Error checking Speaker A status: {e}")
            
            # Check video B
            if not video_url_b:
                try:
                    status_b = video_status(video_id_b, authorization)
                    if status_b["status"] == "completed":
                        video_url_b = status_b["video_url"]
                        print(f"✅ Speaker B video ready: {video_url_b}")
                        update_job_status(
                            job_id,
                            speaker_b_video=video_url_b
                        )
                    elif status_b["status"] == "failed":
                        raise Exception("Speaker B video generation failed")
                except Exception as e:
                    print(f"⚠️ Error checking Speaker B status: {e}")
            
            # Both ready?
            if video_url_a and video_url_b:
                break
            
            # Wait before next check
            time.sleep(10)
        
        # Check if both succeeded
        if not video_url_a or not video_url_b:
            raise Exception("One or more videos failed to generate or timed out")
        
        # Success!
        # In process_podcast_background, after both videos are ready:
        if video_url_a and video_url_b:
            # Create merged podcast video
            update_job_status(
                job_id,
                progress=95,
                message="Creating dynamic podcast video..."
            )
            
            try:
                merged_video_path = create_dynamic_podcast_video(
                    video_url_a,
                    video_url_b,
                    utterances,
                    tempfile.gettempdir()
                )
                
                # Upload merged video (you'll need to implement this)
                # For now, you can save it locally or upload to your storage
                
                print(f"✅ Dynamic podcast video created: {merged_video_path}")
                
                # Success!
                update_job_status(
                    job_id,
                    status="completed",
                    progress=100,
                    message="Podcast video ready!",
                    speaker_a_video=video_url_a,
                    speaker_b_video=video_url_b,
                    merged_video=merged_video_path,  # Add this field
                    transcript=utterances
                )
            except Exception as e:
                print(f"⚠️ Failed to merge videos: {e}")
                # Still return individual videos
                update_job_status(
                    job_id,
                    status="completed",
                    progress=100,
                    message="Avatar videos ready! (Merge failed)",
                    speaker_a_video=video_url_a,
                    speaker_b_video=video_url_b,
                    transcript=utterances
                )
        
    except Exception as e:
        print(f"❌ Job {job_id} failed: {e}")
        import traceback
        traceback.print_exc()
        update_job_status(
            job_id,
            status="failed",
            message="Processing failed",
            error=str(e)
        )
    
    finally:
        # Cleanup temp files
        for temp_file in temp_files:
            try:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
                    print(f"🗑️ Cleaned up: {temp_file}")
            except:
                pass


# API ENDPOINTS

@router.post("/api/podcast/process")
async def process_podcast(
    background_tasks: BackgroundTasks,
    audio_file: UploadFile = File(...),
    speaker_a_avatar: str = Form(...),
    speaker_a_voice: Optional[str] = Form(None),  # Optional
    speaker_b_avatar: str = Form(...),
    speaker_b_voice: Optional[str] = Form(None),  # Optional
    is_custom_avatar_a: bool = Form(False),
    is_custom_avatar_b: bool = Form(False),
    use_original_voice_a: bool = Form(True),  # Default to original voice
    use_original_voice_b: bool = Form(True),  # Default to original voice
    conversation_id: Optional[str] = Form(None),
    authorization: str = Depends(verify_token)
):
    """
    Process uploaded podcast audio into avatar videos.
    
    Voice Options:
    - use_original_voice_a/b = True: Use the actual speaker's voice from the audio
    - use_original_voice_a/b = False: Use HeyGen TTS with provided voice_id
    
    This allows users to preserve original voices or replace them with AI voices.
    """
    import uuid
    
    # Validate audio file
    if not audio_file.content_type.startswith('audio/'):
        raise HTTPException(status_code=400, detail="File must be an audio file")
    
    # Validate voice configuration
    if not use_original_voice_a and not speaker_a_voice:
        raise HTTPException(status_code=400, detail="Speaker A voice_id required when not using original voice")
    
    if not use_original_voice_b and not speaker_b_voice:
        raise HTTPException(status_code=400, detail="Speaker B voice_id required when not using original voice")
    
    # Save uploaded audio to temp file
    temp_audio = os.path.join(tempfile.gettempdir(), f"{uuid.uuid4()}_{audio_file.filename}")
    
    try:
        with open(temp_audio, "wb") as f:
            content = await audio_file.read()
            f.write(content)
        
        print(f"📥 Saved uploaded audio: {temp_audio} ({len(content)} bytes)")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save audio file: {str(e)}")
    
    # Generate unique job ID
    job_id = str(uuid.uuid4())
    
    # Create job record
    job = ProcessingStatus(
        job_id=job_id,
        status="pending",
        progress=0,
        message="Job queued"
    )
    
    processing_jobs[job_id] = job
    
    # Start background processing
    background_tasks.add_task(
        process_podcast_background,
        job_id=job_id,
        audio_file_path=temp_audio,
        speaker_a_avatar=speaker_a_avatar,
        speaker_a_voice=speaker_a_voice,
        speaker_b_avatar=speaker_b_avatar,
        speaker_b_voice=speaker_b_voice,
        is_custom_avatar_a=is_custom_avatar_a,
        is_custom_avatar_b=is_custom_avatar_b,
        use_original_voice_a=use_original_voice_a,
        use_original_voice_b=use_original_voice_b,
        authorization=authorization
    )
    
    return {
        "job_id": job_id,
        "status": "pending",
        "message": "Processing started. Use /api/podcast/job/{job_id} to check status."
    }


@router.get("/api/podcast/job/{job_id}")
async def get_job_status(job_id: str):
    """Get the status of a podcast processing job."""
    if job_id not in processing_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = processing_jobs[job_id]
    return job.dict()


@router.delete("/api/podcast/job/{job_id}")
async def cleanup_job(job_id: str):
    """Remove a job from memory (cleanup after completion)."""
    if job_id in processing_jobs:
        del processing_jobs[job_id]
        return {"message": "Job cleaned up"}
    
    raise HTTPException(status_code=404, detail="Job not found")


@router.get("/api/podcast/jobs")
async def list_jobs():
    """List all processing jobs (for debugging)."""
    return {
        "jobs": [job.dict() for job in processing_jobs.values()],
        "total": len(processing_jobs)
    }