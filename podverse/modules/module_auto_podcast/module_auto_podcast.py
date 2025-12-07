# module_auto_podcast.py - Automatic Podcast Audio Generation
from fastapi import APIRouter, Form, HTTPException, Depends, UploadFile, File, BackgroundTasks
from fastapi.responses import JSONResponse, FileResponse
from connection_supabase_client import get_authenticated_supabase_client, get_service_role_client
from typing import Optional, List
import os
import json
import tempfile
import time
import re
from uuid import uuid4

# Audio processing
try:
    import ffmpeg
    FFMPEG_AVAILABLE = True
except ImportError:
    FFMPEG_AVAILABLE = False
    print("⚠️ ffmpeg-python not available")

# Google Gemini
import google.generativeai as genai

router = APIRouter()

# ========= CONFIGURATION =========
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

# Output directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(BASE_DIR, "output")
TEMP_DIR = os.path.join(BASE_DIR, "temp")
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

# Clean up old temp files on startup
def cleanup_temp_folder():
    """Remove old preview and segment files from temp folder"""
    try:
        count = 0
        for filename in os.listdir(TEMP_DIR):
            file_path = os.path.join(TEMP_DIR, filename)
            # Delete preview files and segment files
            if filename.startswith("preview_") or filename.startswith("segment_") or filename.startswith("silence_"):
                try:
                    os.remove(file_path)
                    count += 1
                except:
                    pass
        if count > 0:
            print(f"🧹 Cleaned up {count} temp files from auto-podcast")
    except Exception as e:
        print(f"⚠️ Temp cleanup error: {e}")

# Run cleanup on module load
cleanup_temp_folder()

# ========= GEMINI LLM SETUP =========
# Cache the working model name to avoid repeated lookups
_cached_model_name = None

def get_gemini_model():
    """Initialize Gemini model"""
    global _cached_model_name
    
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")
    
    genai.configure(api_key=GEMINI_API_KEY)
    
    # If we already found a working model, use it
    if _cached_model_name:
        return genai.GenerativeModel(_cached_model_name)
    
    # Preferred models in order
    preferred_models = [
        "models/gemini-2.5-flash",
        "models/gemini-1.5-flash", 
        "models/gemini-1.5-pro",
        "models/gemini-pro",
    ]
    
    # Try preferred models first
    for model_name in preferred_models:
        try:
            model = genai.GenerativeModel(model_name)
            # Quick test
            test_response = model.generate_content("Hi")
            if test_response and test_response.text:
                _cached_model_name = model_name
                print(f"✅ Using Gemini model: {model_name}")
                return model
        except:
            continue
    
    raise HTTPException(status_code=500, detail="No working Gemini model found. Please check your API key.")

def generate_with_gemini(prompt: str, max_tokens: int = 4096, temperature: float = 0.7) -> str:
    """Generate text using Gemini API"""
    try:
        model = get_gemini_model()
        
        generation_config = genai.GenerationConfig(
            max_output_tokens=max_tokens,
            temperature=temperature,
        )
        
        # Safety settings to avoid blocking educational/informational content
        safety_settings = [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_ONLY_HIGH"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_ONLY_HIGH"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_ONLY_HIGH"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_ONLY_HIGH"},
        ]
        
        response = model.generate_content(
            prompt,
            generation_config=generation_config,
            safety_settings=safety_settings
        )
        
        # Check if response has valid content
        if not response.candidates:
            raise Exception("No response generated - content may have been blocked by safety filters")
        
        candidate = response.candidates[0]
        
        # Check finish reason
        # 1 = STOP (normal), 2 = MAX_TOKENS, 3 = SAFETY, 4 = RECITATION, 5 = OTHER
        if hasattr(candidate, 'finish_reason'):
            finish_reason = candidate.finish_reason
            if finish_reason == 3:  # SAFETY
                raise Exception("Content blocked by safety filters. Try with different knowledge base content.")
            elif finish_reason == 4:  # RECITATION
                raise Exception("Content blocked due to potential copyright issues.")
        
        # Try to get text from parts
        if candidate.content and candidate.content.parts:
            text_parts = [part.text for part in candidate.content.parts if hasattr(part, 'text')]
            if text_parts:
                return ''.join(text_parts)
        
        # Fallback to response.text
        return response.text
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Gemini API Error: {e}")
        raise HTTPException(status_code=500, detail=f"Gemini API error: {str(e)}")

# ========= SCRIPT GENERATION =========
@router.post("/generate-script")
async def generate_podcast_script(
    kb_id: str = Form(...),
    podcast_title: Optional[str] = Form(None),
    host_name: Optional[str] = Form("Alex"),
    guest_name: Optional[str] = Form("Jordan"),
    duration_minutes: Optional[int] = Form(5),
    tone: Optional[str] = Form("conversational"),
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """
    Generate a podcast script from knowledge base content using Gemini API.
    Returns an editable script with HOST and GUEST dialogue.
    """
    try:
        user_id = auth_data["user_id"]
        service_client = get_service_role_client()
        
        print(f"[auto-podcast] Generating script for user: {user_id}, kb_id: {kb_id}")
        
        # Fetch knowledge base content
        docs_query = (
            service_client.table("documents")
            .select("content, metadata")
            .eq("user_id", user_id)
            .eq("kb_id", kb_id)
            .limit(50)
        )
        docs_result = docs_query.execute()
        
        if not docs_result.data:
            return JSONResponse(
                content={
                    "success": False,
                    "error": "No documents found",
                    "message": "No documents found for the selected knowledge base."
                },
                status_code=404
            )
        
        # Combine document content
        all_content = "\n\n".join([doc["content"] for doc in docs_result.data])
        
        if len(all_content.strip()) < 100:
            return JSONResponse(
                content={
                    "success": False,
                    "error": "Insufficient content",
                    "message": "Your knowledge base doesn't have enough content. Please add more documents."
                },
                status_code=400
            )
        
        # Truncate if too long (keep ~8000 chars for context)
        context_summary = all_content[:8000] if len(all_content) > 8000 else all_content
        
        # Calculate approximate word count based on duration
        # Average speaking rate: 150 words per minute
        target_words = duration_minutes * 150
        
        # Build the prompt for Gemini
        prompt = f"""You are an expert podcast script writer specializing in creating NATURAL, CONVERSATIONAL dialogue that sounds like real people talking.

KNOWLEDGE BASE CONTENT:
{context_summary}

PODCAST DETAILS:
- Title: {podcast_title or "Podcast Episode"}
- Host Name: {host_name}
- Guest Name: {guest_name}
- Target Duration: ~{duration_minutes} minutes (~{target_words} words)
- Tone: {tone}

CREATE A NATURAL CONVERSATION:
1. The HOST ({host_name}) interviews the GUEST ({guest_name}) who is an expert on the knowledge base topics
2. ONLY discuss information from the knowledge base - DO NOT invent facts
3. Make it sound like a REAL conversation, not a formal interview

NATURAL DIALOGUE TECHNIQUES (USE THESE):
- Use conversational fillers occasionally: "You know", "I mean", "Right", "Exactly", "Absolutely"
- Include reactions: "Oh wow!", "That's fascinating!", "Interesting!", "Really?"
- Add brief agreements: "Yeah", "Mm-hmm", "Sure", "Definitely"
- Use contractions: "don't", "it's", "that's", "we're", "I've"
- Include brief interruptions or building on points: "Oh, and speaking of that..."
- Vary sentence length - mix short punchy responses with longer explanations
- Show enthusiasm and engagement through word choice

STRUCTURE:
1. Warm intro - Host welcomes guest casually
2. Main discussion - Natural back-and-forth exploring the topics
3. Wrap-up - Casual closing with thanks

FORMAT (STRICTLY FOLLOW):
[HOST]: <dialogue>
[GUEST]: <dialogue>

RULES:
- Each line MUST start with [HOST]: or [GUEST]:
- NO stage directions, NO asterisks, NO parentheses
- Keep individual turns SHORT (1-3 sentences usually, occasionally longer for explanations)
- Frequent speaker switches create natural rhythm
- Total: approximately {target_words} words

Generate the natural podcast script now:"""

        print(f"[auto-podcast] Calling Gemini API...")
        script_text = generate_with_gemini(prompt, max_tokens=4096, temperature=0.7)
        
        if not script_text or len(script_text) < 100:
            return JSONResponse(
                content={
                    "success": False,
                    "error": "Script generation failed",
                    "message": "Failed to generate script. Please try again."
                },
                status_code=500
            )
        
        # Parse script into structured format
        script_lines = parse_script(script_text, host_name, guest_name)
        
        # Calculate estimated duration
        total_words = sum(len(line["text"].split()) for line in script_lines)
        estimated_duration = round(total_words / 150, 1)  # minutes
        
        return JSONResponse(content={
            "success": True,
            "script": script_lines,
            "raw_script": script_text,
            "metadata": {
                "host_name": host_name,
                "guest_name": guest_name,
                "total_lines": len(script_lines),
                "total_words": total_words,
                "estimated_duration_minutes": estimated_duration,
                "podcast_title": podcast_title
            }
        })
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Script generation error: {e}")
        return JSONResponse(
            content={"success": False, "error": str(e)},
            status_code=500
        )


def parse_script(script_text: str, host_name: str, guest_name: str) -> List[dict]:
    """Parse script text into structured format"""
    lines = []
    current_speaker = None
    current_speaker_label = None
    current_text = []
    
    for line in script_text.split('\n'):
        line = line.strip()
        if not line:
            continue
        
        # Check for speaker markers
        host_match = re.match(r'^\[?HOST\]?:?\s*(.*)$', line, re.IGNORECASE)
        guest_match = re.match(r'^\[?GUEST\]?:?\s*(.*)$', line, re.IGNORECASE)
        
        # Also check for name-based markers
        host_name_match = re.match(rf'^\[?{re.escape(host_name)}\]?:?\s*(.*)$', line, re.IGNORECASE)
        guest_name_match = re.match(rf'^\[?{re.escape(guest_name)}\]?:?\s*(.*)$', line, re.IGNORECASE)
        
        if host_match or host_name_match:
            # Save previous speaker's text
            if current_speaker and current_text:
                lines.append({
                    "id": str(uuid4()),
                    "speaker": current_speaker,
                    "speaker_label": current_speaker_label,
                    "text": ' '.join(current_text)
                })
            
            current_speaker = host_name
            current_speaker_label = "HOST"
            text = (host_match or host_name_match).group(1).strip()
            current_text = [text] if text else []
            
        elif guest_match or guest_name_match:
            # Save previous speaker's text
            if current_speaker and current_text:
                lines.append({
                    "id": str(uuid4()),
                    "speaker": current_speaker,
                    "speaker_label": current_speaker_label,
                    "text": ' '.join(current_text)
                })
            
            current_speaker = guest_name
            current_speaker_label = "GUEST"
            text = (guest_match or guest_name_match).group(1).strip()
            current_text = [text] if text else []
            
        elif current_speaker:
            # Continue previous speaker's dialogue
            current_text.append(line)
    
    # Don't forget the last speaker
    if current_speaker and current_text:
        lines.append({
            "id": str(uuid4()),
            "speaker": current_speaker,
            "speaker_label": current_speaker_label,
            "text": ' '.join(current_text)
        })
    
    return lines


# ========= AUDIO GENERATION =========
import base64
import asyncio
import aiohttp

# Deepgram API Configuration
DEEPGRAM_API_KEY = os.environ.get("DEEPGRAM_API_KEY")
DEEPGRAM_TTS_URL = "https://api.deepgram.com/v1/speak"

# Deepgram Aura Voice Options - High-quality conversational AI voices
DEEPGRAM_VOICES = {
    # Female Voices
    "aura-asteria-en": {
        "id": "aura-asteria-en",
        "name": "Asteria",
        "gender": "female",
        "style": "warm",
        "description": "Warm and engaging female voice, perfect for friendly conversations"
    },
    "aura-luna-en": {
        "id": "aura-luna-en",
        "name": "Luna",
        "gender": "female",
        "style": "friendly",
        "description": "Friendly and approachable female voice"
    },
    "aura-stella-en": {
        "id": "aura-stella-en",
        "name": "Stella",
        "gender": "female",
        "style": "professional",
        "description": "Professional and clear female voice"
    },
    "aura-athena-en": {
        "id": "aura-athena-en",
        "name": "Athena",
        "gender": "female",
        "style": "confident",
        "description": "Confident and authoritative female voice"
    },
    "aura-hera-en": {
        "id": "aura-hera-en",
        "name": "Hera",
        "gender": "female",
        "style": "mature",
        "description": "Mature and sophisticated female voice"
    },
    # Male Voices
    "aura-orion-en": {
        "id": "aura-orion-en",
        "name": "Orion",
        "gender": "male",
        "style": "deep",
        "description": "Deep and resonant male voice, great for narration"
    },
    "aura-arcas-en": {
        "id": "aura-arcas-en",
        "name": "Arcas",
        "gender": "male",
        "style": "confident",
        "description": "Confident and professional male voice"
    },
    "aura-perseus-en": {
        "id": "aura-perseus-en",
        "name": "Perseus",
        "gender": "male",
        "style": "warm",
        "description": "Warm and friendly male voice, perfect for podcasts"
    },
    "aura-angus-en": {
        "id": "aura-angus-en",
        "name": "Angus",
        "gender": "male",
        "style": "friendly",
        "description": "Friendly and casual male voice"
    },
    "aura-orpheus-en": {
        "id": "aura-orpheus-en",
        "name": "Orpheus",
        "gender": "male",
        "style": "natural",
        "description": "Natural and conversational male voice"
    },
    "aura-helios-en": {
        "id": "aura-helios-en",
        "name": "Helios",
        "gender": "male",
        "style": "energetic",
        "description": "Energetic and dynamic male voice"
    },
    "aura-zeus-en": {
        "id": "aura-zeus-en",
        "name": "Zeus",
        "gender": "male",
        "style": "authoritative",
        "description": "Authoritative and commanding male voice"
    },
}

async def generate_tts_async(text: str, voice: str, output_path: str, max_retries: int = 3) -> bool:
    """Generate TTS audio using Deepgram Aura voices with retry logic"""
    
    if not DEEPGRAM_API_KEY:
        print("❌ DEEPGRAM_API_KEY not configured")
        return False
    
    # Use the voice ID directly if valid, otherwise default
    voice_id = voice if voice in DEEPGRAM_VOICES else "aura-orpheus-en"
    
    print(f"🎤 Generating TTS for: '{text[:50]}...' with voice {voice_id}")
    
    # Deepgram TTS API request
    headers = {
        "Authorization": f"Token {DEEPGRAM_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Build URL with query parameters
    url = f"{DEEPGRAM_TTS_URL}?model={voice_id}&encoding=linear16&container=wav"
    
    # Ensure output path has .wav extension
    if not output_path.endswith('.wav'):
        output_path = output_path.rsplit('.', 1)[0] + '.wav'
    
    for attempt in range(max_retries):
        try:
            # Increase timeout for longer texts (estimate ~100 chars per second of audio)
            estimated_duration = max(30, len(text) / 10)  # At least 30 seconds
            timeout = aiohttp.ClientTimeout(total=estimated_duration + 60)
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    url,
                    headers=headers,
                    json={"text": text},
                    timeout=timeout
                ) as response:
                    if response.status == 200:
                        # Save audio data to file
                        audio_data = await response.read()
                        
                        with open(output_path, 'wb') as f:
                            f.write(audio_data)
                        
                        if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                            print(f"✅ TTS saved to: {output_path} ({os.path.getsize(output_path)} bytes)")
                            return True
                        else:
                            print(f"❌ TTS file empty or not created")
                            if attempt < max_retries - 1:
                                print(f"🔄 Retrying... (attempt {attempt + 2}/{max_retries})")
                                await asyncio.sleep(1)
                                continue
                            return False
                    else:
                        error_text = await response.text()
                        print(f"❌ Deepgram API error ({response.status}): {error_text}")
                        if attempt < max_retries - 1:
                            print(f"🔄 Retrying... (attempt {attempt + 2}/{max_retries})")
                            await asyncio.sleep(2)
                            continue
                        return False
                
        except asyncio.TimeoutError:
            print(f"⏱️ TTS generation timed out (attempt {attempt + 1}/{max_retries})")
            if attempt < max_retries - 1:
                print(f"🔄 Retrying with longer timeout...")
                await asyncio.sleep(2)
                continue
            print(f"❌ TTS generation failed after {max_retries} attempts")
            return False
        except Exception as e:
            print(f"❌ TTS generation failed: {e}")
            if attempt < max_retries - 1:
                print(f"🔄 Retrying... (attempt {attempt + 2}/{max_retries})")
                await asyncio.sleep(1)
                continue
            import traceback
            traceback.print_exc()
            return False
    
    return False

# Endpoint to get available voices
@router.get("/voices")
async def get_available_voices():
    """Get list of available Deepgram Aura voices for automatic audio generation"""
    voices_list = []
    for voice_id, voice_data in DEEPGRAM_VOICES.items():
        voices_list.append({
            "id": voice_id,
            "name": voice_data["name"],
            "gender": voice_data["gender"],
            "style": voice_data["style"],
            "description": voice_data["description"]
        })
    
    return JSONResponse(content={
        "success": True,
        "voices": voices_list,
        "total": len(voices_list),
        "provider": "deepgram"
    })

# Endpoint to preview a voice
@router.get("/voice-preview/{voice_id}")
async def preview_voice(voice_id: str, background_tasks: BackgroundTasks):
    """Generate a short preview of a voice"""
    try:
        preview_text = "Hello! This is a preview of my voice. I'm perfect for podcast conversations."
        
        # Generate preview audio (Deepgram outputs WAV)
        preview_filename = f"preview_{voice_id}_{uuid4().hex[:8]}.wav"
        preview_path = os.path.join(TEMP_DIR, preview_filename)
        
        # Call async function directly (we're already in async context)
        success = await generate_tts_async(preview_text, voice_id, preview_path)
        
        if success and os.path.exists(preview_path):
            # Schedule file deletion after response is sent
            background_tasks.add_task(delete_file_after_delay, preview_path, delay=10)
            
            return FileResponse(
                preview_path,
                media_type="audio/wav",
                filename=preview_filename
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to generate preview")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def delete_file_after_delay(file_path: str, delay: int = 10):
    """Delete a file after a delay (in seconds)"""
    import time
    time.sleep(delay)
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"🗑️ Cleaned up temp file: {file_path}")
    except Exception as e:
        print(f"⚠️ Failed to delete temp file {file_path}: {e}")

@router.post("/generate-audio")
async def generate_podcast_audio(
    script: str = Form(...),  # JSON string of script lines
    host_voice: Optional[str] = Form("aura-orpheus-en"),  # Deepgram voice for host
    guest_voice: Optional[str] = Form("aura-asteria-en"),  # Deepgram voice for guest
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """
    Generate TTS audio for each line in the script.
    Uses Deepgram Aura voices for natural, conversational audio.
    """
    try:
        user_id = auth_data["user_id"]
        script_lines = json.loads(script)
        
        print(f"[auto-podcast] Generating audio for {len(script_lines)} lines")
        
        # Normalize voice names - if invalid, use defaults
        def normalize_voice(voice_name, default):
            if voice_name in DEEPGRAM_VOICES:
                return voice_name
            # Try to find a matching voice by partial name
            for vid in DEEPGRAM_VOICES:
                if voice_name.lower() in vid.lower():
                    return vid
            return default
        
        host_voice_normalized = normalize_voice(host_voice, "aura-orpheus-en")
        guest_voice_normalized = normalize_voice(guest_voice, "aura-asteria-en")
        
        # Ensure different voices for host and guest
        if host_voice_normalized == guest_voice_normalized:
            guest_voice_normalized = "aura-asteria-en" if "orpheus" in host_voice_normalized else "aura-orpheus-en"
        
        print(f"[auto-podcast] Host voice: {host_voice_normalized}, Guest voice: {guest_voice_normalized}")
        
        # Generate audio for each line
        audio_segments = []
        
        for i, line in enumerate(script_lines):
            print(f"[auto-podcast] Generating audio {i+1}/{len(script_lines)}: {line['speaker_label']}")
            
            # Choose voice based on speaker
            voice = host_voice_normalized if line["speaker_label"] == "HOST" else guest_voice_normalized
            
            # Generate audio file
            output_filename = f"segment_{i:03d}_{line['speaker_label'].lower()}_{uuid4().hex[:8]}.wav"
            output_path = os.path.join(TEMP_DIR, output_filename)
            
            # Generate TTS (await the async function)
            success = await generate_tts_async(
                text=line["text"],
                voice=voice,
                output_path=output_path
            )
            
            if success and os.path.exists(output_path):
                audio_segments.append({
                    "id": line["id"],
                    "speaker": line["speaker"],
                    "speaker_label": line["speaker_label"],
                    "text": line["text"],
                    "audio_path": output_path,
                    "audio_filename": output_filename
                })
            else:
                print(f"⚠️ Skipping line {i} - TTS failed")
        
        print(f"[auto-podcast] Generated {len(audio_segments)} audio segments")
        
        if len(audio_segments) == 0:
            return JSONResponse(
                content={"success": False, "error": "Failed to generate any audio segments"},
                status_code=500
            )
        
        return JSONResponse(content={
            "success": True,
            "segments": [
                {
                    "id": seg["id"],
                    "speaker": seg["speaker"],
                    "speaker_label": seg["speaker_label"],
                    "text": seg["text"],
                    "audio_filename": seg["audio_filename"]
                }
                for seg in audio_segments
            ],
            "total_segments": len(audio_segments)
        })
        
    except Exception as e:
        print(f"❌ Audio generation error: {e}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            content={"success": False, "error": str(e)},
            status_code=500
        )


# ========= AUDIO MERGING =========
@router.post("/merge-audio")
async def merge_podcast_audio(
    segments: str = Form(...),  # JSON string of segment filenames
    output_name: Optional[str] = Form("podcast_final"),
    add_silence_gap: Optional[float] = Form(0.3),  # seconds between segments
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """
    Merge all audio segments into a single podcast audio file.
    """
    try:
        user_id = auth_data["user_id"]
        segment_list = json.loads(segments)
        
        print(f"[auto-podcast] Merging {len(segment_list)} audio segments")
        
        if not FFMPEG_AVAILABLE:
            return JSONResponse(
                content={"success": False, "error": "FFmpeg not available"},
                status_code=500
            )
        
        # Build list of audio files
        audio_files = []
        for seg in segment_list:
            audio_path = os.path.join(TEMP_DIR, seg["audio_filename"])
            if os.path.exists(audio_path):
                audio_files.append(audio_path)
            else:
                print(f"⚠️ Audio file not found: {audio_path}")
        
        if not audio_files:
            return JSONResponse(
                content={"success": False, "error": "No audio files found"},
                status_code=400
            )
        
        # Create silence file for gaps (wav format to match segments)
        silence_path = os.path.join(TEMP_DIR, f"silence_{uuid4().hex[:8]}.wav")
        if add_silence_gap > 0:
            create_silence_file(silence_path, add_silence_gap)
        
        # Create concat file list with escaped paths for Windows
        concat_list_path = os.path.join(TEMP_DIR, f"concat_list_{uuid4().hex[:8]}.txt")
        with open(concat_list_path, "w", encoding="utf-8") as f:
            for i, audio_file in enumerate(audio_files):
                # Use forward slashes for FFmpeg compatibility
                safe_path = audio_file.replace("\\", "/")
                f.write(f"file '{safe_path}'\n")
                if add_silence_gap > 0 and i < len(audio_files) - 1 and os.path.exists(silence_path):
                    safe_silence = silence_path.replace("\\", "/")
                    f.write(f"file '{safe_silence}'\n")
        
        # Merge using FFmpeg - output as wav for compatibility
        output_filename = f"{output_name}_{uuid4().hex[:8]}.wav"
        output_path = os.path.join(OUTPUT_DIR, output_filename)
        
        try:
            ffmpeg.input(concat_list_path, format='concat', safe=0).output(
                output_path,
                acodec='pcm_s16le',
                ar='44100',
                ac=1
            ).overwrite_output().run(quiet=True)
        except Exception as e:
            print(f"❌ FFmpeg merge error: {e}")
            # Fallback: simple concatenation
            output_path = simple_concat_audio(audio_files, output_path)
        
        # Get file info
        file_size = os.path.getsize(output_path) if os.path.exists(output_path) else 0
        
        # Clean up temp files
        cleanup_temp_files(audio_files + [concat_list_path, silence_path])
        
        print(f"✅ Merged audio saved: {output_filename} ({file_size} bytes)")
        
        return JSONResponse(content={
            "success": True,
            "output_path": output_path,
            "output_filename": output_filename,
            "file_size": file_size,
            "download_url": f"/auto-podcast/download/{output_filename}"
        })
        
    except Exception as e:
        print(f"❌ Audio merge error: {e}")
        return JSONResponse(
            content={"success": False, "error": str(e)},
            status_code=500
        )


def create_silence_file(output_path: str, duration: float):
    """Create a silence audio file (mp3 format)"""
    try:
        # Determine output format from extension
        if output_path.endswith('.mp3'):
            ffmpeg.input('anullsrc', format='lavfi', t=duration).output(
                output_path,
                acodec='libmp3lame',
                ar='44100',
                ac=1
            ).overwrite_output().run(quiet=True)
        else:
            ffmpeg.input('anullsrc', format='lavfi', t=duration).output(
                output_path,
                acodec='pcm_s16le',
                ar='44100',
                ac=1
            ).overwrite_output().run(quiet=True)
    except Exception as e:
        print(f"⚠️ Error creating silence file: {e}")


def simple_concat_audio(audio_files: List[str], output_path: str) -> str:
    """Simple audio concatenation fallback using pydub"""
    try:
        from pydub import AudioSegment
        
        combined = AudioSegment.empty()
        for audio_file in audio_files:
            # Handle both mp3 and wav files
            if audio_file.endswith('.mp3'):
                segment = AudioSegment.from_mp3(audio_file)
            else:
                segment = AudioSegment.from_wav(audio_file)
            combined += segment
        
        # Export based on output extension
        if output_path.endswith('.mp3'):
            combined.export(output_path, format="mp3")
        else:
            combined.export(output_path, format="wav")
        return output_path
    except Exception as e:
        print(f"❌ Pydub fallback failed: {e}")
        raise


def cleanup_temp_files(file_paths: List[str]):
    """Clean up temporary files"""
    for path in file_paths:
        try:
            if path and os.path.exists(path):
                os.remove(path)
        except Exception as e:
            print(f"⚠️ Error cleaning up {path}: {e}")


# ========= DOWNLOAD ENDPOINT =========
@router.get("/download/{filename}")
async def download_audio(filename: str):
    """
    Download generated podcast audio file.
    No auth required - files are protected by unique random filenames.
    """
    # Security: only allow specific extensions and no path traversal
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    if not (filename.endswith('.mp3') or filename.endswith('.wav')):
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    file_path = os.path.join(OUTPUT_DIR, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    # Determine media type based on extension
    media_type = "audio/mpeg" if filename.endswith('.mp3') else "audio/wav"
    
    return FileResponse(
        file_path,
        media_type=media_type,
        filename=filename,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


# ========= HEALTH CHECK =========
@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "gemini_configured": bool(GEMINI_API_KEY),
        "ffmpeg_available": FFMPEG_AVAILABLE
    }

