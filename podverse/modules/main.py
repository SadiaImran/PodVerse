from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from module_posts.module_posts_route import router as posts_router
from module_knowledgeBase.module_knowledgeBase_route import router as knowledge_base_router
from module_audios.module_audios_route import router as audios_router

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
app.include_router(audios_router)

