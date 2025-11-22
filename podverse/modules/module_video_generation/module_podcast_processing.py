import os
import json
import tempfile
from typing import Dict, List, Tuple, Optional
from dotenv import load_dotenv
from pydub import AudioSegment
import assemblyai as aai
from fastapi import APIRouter, HTTPException, BackgroundTasks, File, UploadFile, Form, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel
import requests
import time
import subprocess 

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

load_dotenv()
aai.settings.api_key = os.environ.get("ASSEMBLYAI_API_KEY")

router = APIRouter()

# MODELS
class ProcessingStatus(BaseModel):
    """Status of podcast processing"""
    job_id: str
    status: str
    progress: int
    message: str
    speaker_a_video: Optional[str] = None
    speaker_b_video: Optional[str] = None
    merged_video_url: Optional[str] = None 
    speaker_a_video_id: Optional[str] = None
    speaker_b_video_id: Optional[str] = None
    transcript: Optional[List[Dict]] = None
    error: Optional[str] = None

# In-memory job tracking
processing_jobs: Dict[str, ProcessingStatus] = {}
# Store merged video paths
merged_video_files: Dict[str, str] = {}


def generate_srt_from_utterances(utterances: List[Dict], output_path: str) -> str:
    """
    Generate an SRT subtitle file from speaker utterances.
    
    Args:
        utterances: List of dicts with 'speaker', 'start', 'end', 'text'
        output_path: Path where SRT file should be saved
    
    Returns:
        Path to the generated SRT file
    """
    def ms_to_srt_time(milliseconds: int) -> str:
        """Convert milliseconds to SRT time format (HH:MM:SS,mmm)"""
        seconds, ms = divmod(milliseconds, 1000)
        minutes, seconds = divmod(seconds, 60)
        hours, minutes = divmod(minutes, 60)
        return f"{hours:02d}:{minutes:02d}:{seconds:02d},{ms:03d}"
    
    srt_lines = []
    
    for idx, utt in enumerate(utterances, start=1):
        start_time = ms_to_srt_time(utt["start"])
        end_time = ms_to_srt_time(utt["end"])
        speaker = utt["speaker"]
        text = utt["text"]
        
        # Format: Speaker A: text or Speaker B: text
        subtitle_text = f"Speaker {speaker}: {text}"
        
        srt_lines.append(f"{idx}")
        srt_lines.append(f"{start_time} --> {end_time}")
        srt_lines.append(subtitle_text)
        srt_lines.append("")  # Blank line between entries
    
    # Write to file
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(srt_lines))
    
    print(f"✅ SRT file created: {output_path}")
    print(f"📊 Total subtitles: {len(utterances)}")
    
    return output_path


def burn_subtitles_to_video(video_path: str, srt_path: str, output_path: str) -> str:
    """
    Burn subtitles into a video using FFmpeg.
    
    Args:
        video_path: Input video file
        srt_path: SRT subtitle file
        output_path: Output video with burned subtitles
    
    Returns:
        Path to the output video
    """
    print(f"🔥 Burning subtitles into video...")
    print(f"  Video: {video_path}")
    print(f"  Subtitles: {srt_path}")
    
    import shutil
    
    video_dir = os.path.dirname(video_path)
    simple_srt_name = "temp_subtitles.srt"
    simple_srt_path = os.path.join(video_dir, simple_srt_name)
    
    # Copy SRT to simple path
    shutil.copy2(srt_path, simple_srt_path)
    print(f"  Copied SRT to: {simple_srt_path}")
    
    try:
        # Now use the simple filename (relative path, no special chars)
        subtitle_filter = (
            f"subtitles={simple_srt_name}:"
            f"force_style='"
            f"Fontsize=16,"
            f"PrimaryColour=&HFFFFFF&,"       # White text
            f"OutlineColour=&H000000&,"       # Black outline
            f"Outline=2,"                     # Thick outline
            f"BackColour=&H80000000&,"        # Semi-transparent black background
            f"BorderStyle=3,"                 # Box background
            f"Shadow=1,"                      # Shadow
            f"MarginV=20,"                    # Position from bottom
            f"MarginL=30,"                    # Left margin
            f"MarginR=30,"                    # Right margin
            f"Alignment=2"                    # Bottom center
            f"'"
        )
        
        ffmpeg_cmd = [
            'ffmpeg',
            '-i', video_path,
            '-vf', subtitle_filter,
            '-c:a', 'copy',                  # Copy audio without re-encoding
            '-y',                            # Overwrite output
            output_path
        ]
        
        # Change working directory to video directory so relative path works
        original_cwd = os.getcwd()
        os.chdir(video_dir)
        
        print(f"🎬 Running FFmpeg from directory: {video_dir}")
        
        result = subprocess.run(
            ffmpeg_cmd,
            check=True,
            capture_output=True,
            text=True,
            cwd=video_dir  # Set working directory
        )
        
        os.chdir(original_cwd)  # Restore original directory
        
        print(f"✅ Subtitles burned successfully!")
        print(f"📊 Output size: {os.path.getsize(output_path)} bytes")
        
        return output_path
        
    except subprocess.CalledProcessError as e:
        # Restore directory if error
        try:
            os.chdir(original_cwd)
        except:
            pass
            
        print(f"❌ FFmpeg subtitle burning failed!")
        print(f"STDOUT: {e.stdout[-1000:]}")
        print(f"STDERR: {e.stderr[-1000:]}")
        
        # Try to find actual error in stderr
        error_lines = e.stderr.split('\n')
        actual_error = [line for line in error_lines if 'Error' in line or 'failed' in line or 'Invalid' in line]
        if actual_error:
            error_msg = '\n'.join(actual_error[-5:])
        else:
            error_msg = e.stderr[-500:]
        
        raise Exception(f"Failed to burn subtitles: {error_msg}")
    
    finally:
        # Clean up temporary SRT copy
        try:
            if os.path.exists(simple_srt_path):
                os.remove(simple_srt_path)
                print(f"🗑️ Cleaned up temporary SRT: {simple_srt_path}")
        except Exception as e:
            print(f"⚠️ Could not remove temp SRT: {e}")


def build_speaker_switch_filter(utterances: List[Dict]) -> str:
    """
    Build FFmpeg filter_complex string to switch between speaker videos.
    
    CRITICAL FIX: The speaker videos from HeyGen contain ONLY that speaker's audio segments
    concatenated together. So we need to calculate the cumulative position within each 
    speaker's video, not use the original timestamps.
    """
    segments = []
    
    # Track cumulative time position for each speaker's video
    speaker_positions = {"A": 0.0, "B": 0.0}
    
    for i, utt in enumerate(utterances):
        speaker = utt["speaker"]
        duration_ms = utt["end"] - utt["start"]
        duration_sec = duration_ms / 1000.0
        
        input_idx = 0 if speaker == "A" else 1
        
        # Get the current position in this speaker's video
        start_in_speaker_video = speaker_positions[speaker]
        
        segments.append({
            'input': input_idx,
            'start': start_in_speaker_video,  # Position in speaker's video
            'duration': duration_sec,
            'speaker': speaker,
            'original_start': utt["start"] / 1000.0  # For debugging
        })
        
        # Update position for this speaker
        speaker_positions[speaker] += duration_sec
        
        print(f"  Segment {i}: Speaker {speaker} | "
              f"Original: {utt['start']/1000:.2f}s | "
              f"In Speaker Video: {start_in_speaker_video:.2f}s | "
              f"Duration: {duration_sec:.2f}s")
    
    # Build filter_complex
    filter_parts = []
    
    for i, seg in enumerate(segments):
        input_idx = seg['input']
        start = seg['start']
        duration = seg['duration']
        
        # Trim from the specific position in the speaker's video
        filter_parts.append(
            f"[{input_idx}:v]trim=start={start}:duration={duration},setpts=PTS-STARTPTS[v{i}];"
            f"[{input_idx}:a]atrim=start={start}:duration={duration},asetpts=PTS-STARTPTS[a{i}]"
        )
    
    video_inputs = ''.join([f"[v{i}]" for i in range(len(segments))])
    audio_inputs = ''.join([f"[a{i}]" for i in range(len(segments))])
    
    concat_filter = (
        f"{video_inputs}concat=n={len(segments)}:v=1:a=0[outv];"
        f"{audio_inputs}concat=n={len(segments)}:v=0:a=1[outa]"
    )
    
    return ";".join(filter_parts) + ";" + concat_filter


def create_dynamic_podcast_video(
    video_a_url: str,
    video_b_url: str,
    utterances: List[Dict],
    output_path: str,
    add_subtitles: bool = False  # NEW PARAMETER
) -> str:
    """
    Create a dynamic podcast video that switches between speakers.
    Optionally adds burned-in subtitles.
    """
    import tempfile
    import requests
    
    temp_dir = tempfile.gettempdir()
    video_a_path = os.path.join(temp_dir, f"speaker_a_video_{int(time.time())}.mp4")
    video_b_path = os.path.join(temp_dir, f"speaker_b_video_{int(time.time())}.mp4")
    
    print("📥 Downloading Speaker A video...")
    try:
        response = requests.get(video_a_url, timeout=300, stream=True)
        response.raise_for_status()
        with open(video_a_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"✅ Downloaded Speaker A: {os.path.getsize(video_a_path)} bytes")
    except Exception as e:
        raise Exception(f"Failed to download Speaker A video: {e}")
    
    print("📥 Downloading Speaker B video...")
    try:
        response = requests.get(video_b_url, timeout=300, stream=True)
        response.raise_for_status()
        with open(video_b_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"✅ Downloaded Speaker B: {os.path.getsize(video_b_path)} bytes")
    except Exception as e:
        raise Exception(f"Failed to download Speaker B video: {e}")
    
    print("🎬 Building FFmpeg filter...")
    filter_complex = build_speaker_switch_filter(utterances)
    
    filter_file = os.path.join(temp_dir, f"ffmpeg_filter_{int(time.time())}.txt")
    with open(filter_file, 'w') as f:
        f.write(filter_complex)
    print(f"📄 Filter saved to: {filter_file}")
    
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
        '-preset', 'fast',
        '-y',
        merged_path
    ]
    
    try:
        result = subprocess.run(
            ffmpeg_cmd, 
            check=True, 
            capture_output=True,
            text=True
        )
        print(f"✅ Merged video created: {merged_path}")
        print(f"📊 Output size: {os.path.getsize(merged_path)} bytes")
    except subprocess.CalledProcessError as e:
        print(f"❌ FFmpeg failed!")
        print(f"STDERR: {e.stderr}")
        raise Exception(f"FFmpeg merge failed: {e.stderr[:500]}")
    
    # NEW: Add subtitles if requested
    final_output = merged_path
    
    if add_subtitles:
        print("\n📝 Adding subtitles to video...")
        
        srt_path = os.path.join(temp_dir, f"subtitles_{int(time.time())}.srt")
        generate_srt_from_utterances(utterances, srt_path)
        
        subtitled_path = os.path.join(temp_dir, f"podcast_subtitled_{int(time.time())}.mp4")
        burn_subtitles_to_video(merged_path, srt_path, subtitled_path)
        
        # Clean up intermediate files
        os.remove(merged_path)
        os.remove(srt_path)
        
        final_output = subtitled_path
        print(f"✅ Final video with subtitles: {final_output}")
    
    # Cleanup downloaded videos
    try:
        os.remove(video_a_path)
        os.remove(video_b_path)
        os.remove(filter_file)
        print("🗑️ Cleaned up temporary video files")
    except Exception as e:
        print(f"⚠️ Cleanup warning: {e}")
    
    return final_output


def transcribe_and_diarize(audio_file: str) -> Tuple[List[Dict], Dict[str, str]]:
    """Transcribe audio with speaker diarization and split into separate files."""
    print("🎙️ Starting speaker diarization with AssemblyAI...")
    
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
    
    utterances = []
    for utt in transcript.utterances:
        utterances.append({
            "speaker": utt.speaker,
            "start": utt.start,
            "end": utt.end,
            "text": utt.text
        })
        print(f"  {utt.speaker} ({utt.start//1000}s-{utt.end//1000}s): {utt.text[:50]}...")
    
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
            out_path = os.path.join(tempfile.gettempdir(), f"speaker_{speaker_label}.wav")
            speaker_audio.export(out_path, format="wav")
            audio_files[speaker_label] = out_path
            duration = len(speaker_audio) / 1000
            print(f"✅ Exported Speaker {speaker_label}: {duration:.1f}s")
    
    return utterances, audio_files


def upload_audio_to_heygen(audio_file_path: str) -> str:
    """Upload audio file to HeyGen and return asset_id."""
    print(f"📤 Uploading audio to HeyGen: {audio_file_path}")
    
    with open(audio_file_path, 'rb') as f:
        file_content = f.read()
    
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
    """Extract and combine text for a specific speaker."""
    texts = [u["text"] for u in utterances if u["speaker"] == speaker_label]
    combined = " ".join(texts)
    
    if len(combined) > max_chars:
        print(f"⚠️ Speaker {speaker_label} text too long ({len(combined)} chars), truncating to {max_chars}")
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


def process_podcast_background(
    job_id: str,
    audio_file_path: str,
    speaker_a_avatar: str,
    speaker_a_voice: Optional[str],
    speaker_b_avatar: str,
    speaker_b_voice: Optional[str],
    is_custom_avatar_a: bool,
    is_custom_avatar_b: bool,
    use_original_voice_a: bool,
    use_original_voice_b: bool,
    add_subtitles: bool,  # NEW PARAMETER
    authorization: str
):
    """Background task to process podcast audio into avatar videos."""
    temp_files = [audio_file_path]
    
    try:
        # Step 1: Diarization
        update_job_status(job_id, status="diarizing", progress=20, message="Running speaker diarization...")
        
        utterances, audio_files = transcribe_and_diarize(audio_file_path)
        temp_files.extend(audio_files.values())
        
        print(f"\n📊 Diarization Summary:")
        print(f"  Total utterances: {len(utterances)}")
        print(f"  Speaker A segments: {len([u for u in utterances if u['speaker'] == 'A'])}")
        print(f"  Speaker B segments: {len([u for u in utterances if u['speaker'] == 'B'])}")
        
        # Step 2: Upload speaker audio files to HeyGen
        update_job_status(job_id, progress=35, message="Uploading speaker audio files...")
        
        audio_asset_id_a = None
        audio_asset_id_b = None
        
        if use_original_voice_a and "A" in audio_files:
            audio_asset_id_a = upload_audio_to_heygen(audio_files["A"])
            print(f"✅ Speaker A audio uploaded: {audio_asset_id_a}")
        
        if use_original_voice_b and "B" in audio_files:
            audio_asset_id_b = upload_audio_to_heygen(audio_files["B"])
            print(f"✅ Speaker B audio uploaded: {audio_asset_id_b}")
        
        # Step 3: Extract text
        update_job_status(job_id, progress=45, message="Processing speaker scripts...")
        
        text_a = get_speaker_text(utterances, "A")
        text_b = get_speaker_text(utterances, "B")
        
        print(f"\n📝 Speaker A: {len(text_a)} characters")
        print(f"📝 Speaker B: {len(text_b)} characters")
        
        # Step 4: Generate videos
        update_job_status(job_id, status="generating_videos", progress=55, message="Generating Speaker A video...")
        
        from .module_video import GenerateRequest
        
        if use_original_voice_a and audio_asset_id_a:
            req_a = GenerateRequest(
                avatar_id=speaker_a_avatar,
                input_type="audio",
                audio_asset_id=audio_asset_id_a,
                is_custom_avatar=is_custom_avatar_a
            )
            print(f"🎤 Speaker A: Using original voice (audio asset)")
        else:
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
        
        if use_original_voice_b and audio_asset_id_b:
            req_b = GenerateRequest(
                avatar_id=speaker_b_avatar,
                input_type="audio",
                audio_asset_id=audio_asset_id_b,
                is_custom_avatar=is_custom_avatar_b
            )
            print(f"🎤 Speaker B: Using original voice (audio asset)")
        else:
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
        max_wait = 600
        start_time = time.time()
        
        video_url_a = None
        video_url_b = None
        
        while time.time() - start_time < max_wait:
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
            
            if video_url_a and video_url_b:
                break
            
            time.sleep(10)
        
        if not video_url_a or not video_url_b:
            raise Exception("One or more videos failed to generate or timed out")
        
        # Step 6: Merge videos (with optional subtitles)
        if video_url_a and video_url_b:
            subtitle_msg = " with subtitles" if add_subtitles else ""
            update_job_status(
                job_id,
                progress=95,
                message=f"Creating dynamic podcast video{subtitle_msg}..."
            )
            
            try:
                merged_video_path = create_dynamic_podcast_video(
                    video_url_a,
                    video_url_b,
                    utterances,
                    tempfile.gettempdir(),
                    add_subtitles=add_subtitles  # Pass the flag
                )
                
                merged_video_files[job_id] = merged_video_path
                merged_video_url = f"/video/api/podcast/merged/{job_id}"
                
                print(f"✅ Dynamic podcast video created: {merged_video_path}")
                
                update_job_status(
                    job_id,
                    status="completed",
                    progress=100,
                    message="Podcast video ready!",
                    speaker_a_video=video_url_a,
                    speaker_b_video=video_url_b,
                    merged_video_url=merged_video_url,
                    transcript=utterances
                )
            except Exception as e:
                print(f"⚠️ Failed to merge videos: {e}")
                import traceback
                traceback.print_exc()
                update_job_status(
                    job_id,
                    status="completed",
                    progress=100,
                    message="Avatar videos ready! (Merge failed)",
                    speaker_a_video=video_url_a,
                    speaker_b_video=video_url_b,
                    transcript=utterances,
                    error=f"Merge failed: {str(e)}"
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
    speaker_a_voice: Optional[str] = Form(None),
    speaker_b_avatar: str = Form(...),
    speaker_b_voice: Optional[str] = Form(None),
    is_custom_avatar_a: bool = Form(False),
    is_custom_avatar_b: bool = Form(False),
    use_original_voice_a: bool = Form(True),
    use_original_voice_b: bool = Form(True),
    add_subtitles: bool = Form(False),  # NEW PARAMETER
    conversation_id: Optional[str] = Form(None),
    authorization: str = Depends(verify_token)
):
    """Process uploaded podcast audio into avatar videos."""
    import uuid
    
    if not audio_file.content_type.startswith('audio/'):
        raise HTTPException(status_code=400, detail="File must be an audio file")
    
    if not use_original_voice_a and not speaker_a_voice:
        raise HTTPException(status_code=400, detail="Speaker A voice_id required when not using original voice")
    
    if not use_original_voice_b and not speaker_b_voice:
        raise HTTPException(status_code=400, detail="Speaker B voice_id required when not using original voice")
    
    temp_audio = os.path.join(tempfile.gettempdir(), f"{uuid.uuid4()}_{audio_file.filename}")
    
    try:
        with open(temp_audio, "wb") as f:
            content = await audio_file.read()
            f.write(content)
        
        print(f"📥 Saved uploaded audio: {temp_audio} ({len(content)} bytes)")
        print(f"📝 Subtitles requested: {add_subtitles}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save audio file: {str(e)}")
    
    job_id = str(uuid.uuid4())
    
    job = ProcessingStatus(
        job_id=job_id,
        status="pending",
        progress=0,
        message="Job queued"
    )
    
    processing_jobs[job_id] = job
    
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
        add_subtitles=add_subtitles,  # Pass the flag
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


@router.get("/api/podcast/merged/{job_id}")
async def get_merged_video(job_id: str):
    """Serve the merged video file."""
    if job_id not in merged_video_files:
        raise HTTPException(status_code=404, detail="Merged video not found")
    
    video_path = merged_video_files[job_id]
    
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video file not found on disk")
    
    return FileResponse(
        video_path,
        media_type="video/mp4",
        filename=f"podcast_{job_id}.mp4"
    )


@router.delete("/api/podcast/job/{job_id}")
async def cleanup_job(job_id: str):
    """Remove a job from memory and delete merged video."""
    if job_id in processing_jobs:
        del processing_jobs[job_id]
    
    if job_id in merged_video_files:
        video_path = merged_video_files[job_id]
        try:
            if os.path.exists(video_path):
                os.remove(video_path)
                print(f"🗑️ Deleted merged video: {video_path}")
        except Exception as e:
            print(f"⚠️ Failed to delete merged video: {e}")
        
        del merged_video_files[job_id]
    
    return {"message": "Job cleaned up"}


@router.get("/api/podcast/jobs")
async def list_jobs():
    """List all processing jobs (for debugging)."""
    return {
        "jobs": [job.dict() for job in processing_jobs.values()],
        "total": len(processing_jobs)
    }

@router.get("/api/avatar-templates/{speaker}")
async def get_avatar_templates(speaker: str):
    """Get avatar template images for a specific speaker (A or B)."""
    if speaker not in ["A", "B"]:
        raise HTTPException(status_code=400, detail="Speaker must be 'A' or 'B'")
    
    from supabase import create_client
    import os
    
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    supabase = create_client(supabase_url, supabase_key)
    
    folder_path = f"speaker-{speaker.lower()}"
    
    try:
        files = supabase.storage.from_('avatar-templates').list(folder_path)
        
        templates = []
        for file in files:
            public_url = supabase.storage.from_('avatar-templates').get_public_url(
                f"{folder_path}/{file['name']}"
            )
            templates.append({
                "id": file['name'].split('.')[0],
                "name": file['name'].replace('-', ' ').replace('.jpg', '').replace('.png', '').title(),
                "url": public_url,
                "speaker": speaker
            })
        
        return {"templates": templates}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch templates: {str(e)}")