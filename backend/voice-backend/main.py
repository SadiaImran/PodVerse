from fastapi import FastAPI, UploadFile , Form
from typing import List
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import shutil, os
from uuid import uuid4
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from app.coqui_pipeline import clone_voice  

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
        save_to = UPLOAD_DIR + "/" + file.filename
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

