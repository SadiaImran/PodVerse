from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from module_posts.module_posts_route import router as posts_router
from module_knowledgeBase.module_knowledgeBase_route import router as knowledge_base_router
from module_knowledgeBase.ai import router as ai_router
from module_audios.module_audios_route import router as audios_router
from module_audio_edit.module_audio_edit import router as audio_edit_router
from module_ai.livekit_token import router as livekit_router
from module_voices.module_voices import router as voices_router
# from module_voice_clone.module_voice_clone import router as voice_clone_router
from module_faq.module_faq_route import router as faq_router
from fastapi.staticfiles import StaticFiles

import tempfile
import os
import time
import json

# Ensure output directory exists
os.makedirs("module_voice_clone/output", exist_ok=True)

app = FastAPI()

# Configure CORS
origins = [
    "http://localhost",
    "http://localhost:5173",
    "http://127.0.0.1",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(posts_router)
app.include_router(knowledge_base_router)
app.include_router(ai_router, prefix="/ai", tags=["ai"])
app.include_router(audios_router)
app.include_router(livekit_router, prefix="/livekit", tags=["livekit"])
# app.include_router(voice_clone_router, prefix="/voice-clone", tags=["voice-clone"])
app.include_router(audio_edit_router, prefix="/audio-edit", tags=["audio-edit"])

app.mount("/output", StaticFiles(directory="module_voice_clone/output"), name="output")
app.include_router(voices_router)
app.include_router(faq_router)

