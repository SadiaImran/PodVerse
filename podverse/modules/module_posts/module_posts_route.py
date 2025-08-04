from fastapi import APIRouter
from connection_supabase_client import supabase

router = APIRouter()

@router.get("/posts")
def get_all_posts():
    response = supabase.table("posts").select("*, profiles(full_name), comments(*, profiles(full_name))").order("created_at", desc=True).execute()
    return response.data
