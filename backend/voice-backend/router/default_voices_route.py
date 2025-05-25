from fastapi import APIRouter
from controllers.default_voices_controller import (
    get_all_default_voices,
    create_default_voice,
    update_default_voice,
    delete_default_voice,
)

router = APIRouter()

@router.get("/")
async def get_all_default_voices_route():
    return await get_all_default_voices()

@router.post("/")
async def create_default_voice_route():
    return await create_default_voice()

@router.put("/{id}")
async def update_default_voice_route(id: str):
    return await update_default_voice(id)

@router.delete("/{id}")
async def delete_default_voice_route(id: str):
    return await delete_default_voice(id)