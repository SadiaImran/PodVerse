from fastapi import FastAPI, UploadFile, Form, Request
from typing import List
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from uuid import uuid4
import shutil, os
from dotenv import load_dotenv
# from app.coqui_pipeline import clone_voice  
from router.default_voices_route import router as default_voices_router
from router.user_profile_route import router as update_profile_router
from config import db  

load_dotenv()

app = FastAPI()
@app.on_event("startup")
async def startup_event():
    try:
        await db.command("ping")
        print("🟢 MongoDB connected successfully!")
    except Exception as e:
        print("🔴 MongoDB connection failed:", e)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,  
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "audio"
OUTPUT_DIR = "output"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

app.mount("/output", StaticFiles(directory="output"), name="output")

@app.post("/voice-clone/")
async def voice_clone_upload(file_upload: List[UploadFile], text: str = Form(...)):
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

    clone_voice(text_input=text, speaker_paths=file_paths, output_path=output_path)

    return JSONResponse({
        "output_audio": f"/{output_path}" 
    })

# Routers
app.include_router(default_voices_router, prefix="/api/default-voices")
app.include_router(update_profile_router, prefix="/api/update-profile")

# Global error handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"detail": str(exc)})