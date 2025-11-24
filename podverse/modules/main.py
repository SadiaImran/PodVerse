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
from module_video_generation.module_video import router as video_router
from module_video_generation.module_podcast_processing import router as podcast_router
from module_social_media.routes import router as social_media_router
from module_admin.module_admin_route import router as admin_router
from module_subscription.subscription_route import router as subscription_router
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
    "http://localhost:5174",
    "http://127.0.0.1",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
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
# Video router handles both HeyGen video generation and Supabase video storage
# Registered with both prefixes for backward compatibility
app.include_router(video_router, prefix="/video", tags=["video"])  # HeyGen endpoints: /video/api/...
app.include_router(podcast_router, prefix="/video", tags=["video"])  # Podcast processing endpoints
app.include_router(video_router, prefix="/videos", tags=["video"])  # Supabase endpoints: /videos/upload, /videos/list
app.include_router(subscription_router)

app.mount("/output", StaticFiles(directory="module_voice_clone/output"), name="output")
app.include_router(voices_router)
app.include_router(faq_router)
app.include_router(social_media_router)
app.include_router(admin_router)

