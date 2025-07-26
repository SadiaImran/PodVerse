from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from module_posts.module_posts_route import router as posts_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(posts_router)

