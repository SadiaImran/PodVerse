from fastapi import APIRouter, UploadFile, Form
from fastapi.responses import FileResponse
import subprocess, os, uuid

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
