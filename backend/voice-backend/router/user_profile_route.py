from fastapi import APIRouter
from controllers.update_profile_controller import (
    get_all_profile,
    create_profile,
    update_profile,
    delete_profile,
)

router = APIRouter()

@router.get("/")
async def get_all_profile_route():
    return await get_all_profile()

@router.post("/")
async def create_profile_route():
    return await create_profile()

@router.put("/{id}")
async def update_profile_route(id: str):
    return await update_profile(id)

@router.delete("/{id}")
async def delete_profile_route(id: str):
    return await delete_profile(id)