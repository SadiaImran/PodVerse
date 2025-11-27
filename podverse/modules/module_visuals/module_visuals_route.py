from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Query
from connection_supabase_client import (
    get_authenticated_supabase_client,
    get_service_role_client,
)
from pydantic import BaseModel
from typing import List
import uuid
import os
import requests


router = APIRouter()
PEXELS_API_KEY = os.getenv("PEXELS_API_KEY")


def _sanitize_filename(filename: str, fallback: str = "visual") -> str:
    if not filename:
        return fallback
    basename = os.path.basename(filename)
    sanitized = "".join(c for c in basename if c.isalnum() or c in ("-", "_", ".", " "))
    sanitized = sanitized.strip().replace(" ", "_")
    return sanitized or fallback


def _extract_public_url(response):
    if isinstance(response, dict):
        return (
            response.get("publicUrl")
            or response.get("public_url")
            or response.get("signedURL")
            or response.get("signed_url")
            or response.get("url")
        )
    return response


def _fetch_pexels_resource(endpoint: str, params: dict):
    if not PEXELS_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="PEXELS_API_KEY is not configured on the server.",
        )

    headers = {"Authorization": PEXELS_API_KEY}
    try:
        response = requests.get(endpoint, headers=headers, params=params, timeout=20)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as exc:
        error_text = getattr(exc.response, "text", None)
        print(f"❌ Pexels fetch failed: {exc} - {error_text}")
        raise HTTPException(
            status_code=502, detail="Failed to fetch stock media from provider."
        )


@router.post("/visuals/upload")
async def upload_visual_media(
    file: UploadFile = File(...),
    auth_data: dict = Depends(get_authenticated_supabase_client),
):
    """
    Upload a visual asset (image/video/audio) to the public `visuals` bucket and return its URL.
    """
    try:
        user_id = auth_data["user_id"]
        # Use service-role client for storage operations to bypass RLS while still enforcing user ownership manually
        service_client = get_service_role_client()

        if not file:
            raise HTTPException(status_code=400, detail="No file provided")

        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")

        safe_name = _sanitize_filename(file.filename or "visual")
        _, ext = os.path.splitext(safe_name)
        ext = ext or ".bin"
        storage_path = f"{user_id}/{uuid.uuid4().hex}{ext}"

        file_options = {
            "content-type": file.content_type or "application/octet-stream",
            "upsert": "true",
        }

        try:
            service_client.storage.from_("visuals").upload(
                storage_path,
                contents,
                file_options=file_options,
            )
        except Exception as upload_error:
            print(f"❌ Failed to upload visual: {upload_error}")
            raise HTTPException(status_code=500, detail="Failed to upload visual asset")

        public_url_resp = service_client.storage.from_("visuals").get_public_url(
            storage_path
        )
        public_url = _extract_public_url(public_url_resp)

        if not public_url:
            raise HTTPException(
                status_code=500, detail="Failed to generate public URL for visual"
            )

        return {
            "success": True,
            "id": storage_path,
            "public_url": public_url,
            "storage_path": storage_path,
            "size": len(contents),
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Unexpected error uploading visual: {e}")
        raise HTTPException(status_code=500, detail="Unexpected error uploading visual")


class VisualCleanupRequest(BaseModel):
    paths: List[str]


@router.post("/visuals/cleanup")
async def cleanup_visuals(
    request: VisualCleanupRequest,
    auth_data: dict = Depends(get_authenticated_supabase_client),
):
    """
    Delete one or more visual assets that belong to the authenticated user.
    """
    try:
        user_id = auth_data["user_id"]
        if not request.paths:
            return {"success": True, "deleted": 0}

        allowed_paths = [
            path
            for path in request.paths
            if path and path.startswith(f"{user_id}/")
        ]

        if not allowed_paths:
            return {"success": True, "deleted": 0}

        service_client = get_service_role_client()
        service_client.storage.from_("visuals").remove(allowed_paths)

        return {"success": True, "deleted": len(allowed_paths)}
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error cleaning up visuals: {e}")
        raise HTTPException(status_code=500, detail="Failed to cleanup visuals")


@router.get("/visuals/stock/videos")
async def get_stock_videos(
    query: str = Query("Nature", min_length=1),
    per_page: int = Query(30, ge=1, le=80),
    size: str = Query("medium"),
    auth_data: dict = Depends(get_authenticated_supabase_client),
):
    """
    Proxy request to the Pexels Videos API to avoid browser CORS limitations.
    """
    params = {
        "query": query,
        "per_page": per_page,
        "size": size,
    }
    payload = _fetch_pexels_resource(
        "https://api.pexels.com/videos/search", params=params
    )
    return payload


@router.get("/visuals/stock/images")
async def get_stock_images(
    query: str = Query("Nature", min_length=1),
    per_page: int = Query(30, ge=1, le=80),
    auth_data: dict = Depends(get_authenticated_supabase_client),
):
    """
    Proxy request to the Pexels Images API to avoid browser CORS limitations.
    """
    params = {
        "query": query,
        "per_page": per_page,
    }
    payload = _fetch_pexels_resource("https://api.pexels.com/v1/search", params=params)
    return payload

