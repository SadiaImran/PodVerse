from fastapi import APIRouter
from connection_supabase_client import supabase

router = APIRouter()

@router.get("/posts")
def get_all_posts():
    result = supabase.table("posts").select("*").order("created_at", desc=True).execute()
    return result.data
