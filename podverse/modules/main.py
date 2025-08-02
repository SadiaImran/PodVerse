from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from module_posts.module_posts_route import router as posts_router
from module_knowledgeBase.module_knowledgeBase_route import router as knowledge_base_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(posts_router)
app.include_router(knowledge_base_router)

