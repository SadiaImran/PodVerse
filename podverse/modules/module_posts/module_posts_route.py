from fastapi import APIRouter, HTTPException, Depends, Query
from connection_supabase_client import supabase, get_authenticated_supabase_client, get_service_role_client
from typing import Optional, List
from pydantic import BaseModel
import subprocess
import os
import tempfile
import uuid
import requests
import re

router = APIRouter()

# ==================== Models ====================

class CommentCreate(BaseModel):
    post_id: str
    content: str

class LikeResponse(BaseModel):
    success: bool
    liked: bool
    likes_count: int

class PostCreate(BaseModel):
    title: str
    description: str
    video_url: str
    thumbnail_url: str
    status: str  # "draft" or "published"
    tags: Optional[List[str]] = []  # List of tag names
    transcript_url: Optional[str] = None

# Duplicate class retained for backward compatibility (TODO: consolidate)
class PostCreate(BaseModel):
    title: str
    description: str
    video_url: str
    thumbnail_url: str
    status: str  # "draft" or "published"
    tags: Optional[List[str]] = []  # List of tag names
    transcript_url: Optional[str] = None

def generate_thumbnail(video_path: str, output_path: str, timestamp: str = "00:00:03") -> bool:
    """
    Generate thumbnail from video using FFmpeg
    
    """
    try:
        # FFmpeg command to extract thumbnail
        command = [
            'ffmpeg',
            '-ss', timestamp,  # Seek to timestamp (before input for faster processing)
            '-i', video_path,  # Input video
            '-vframes', '1',  # Extract only 1 frame
            '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2',  # Scale and pad
            '-q:v', '2',  # High quality (2-31, lower is better)
            '-y',  # Overwrite output file
            output_path
        ]
        
        # Run FFmpeg
        result = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=30  # 30 second timeout
        )
        
        if result.returncode != 0:
            print(f"FFmpeg error: {result.stderr.decode()}")
        
        return result.returncode == 0
    
    except subprocess.TimeoutExpired:
        print("FFmpeg thumbnail generation timed out")
        return False
    except Exception as e:
        print(f"Error generating thumbnail: {e}")
        return False


def download_video_from_supabase(bucket_name: str, file_path: str, output_path: str) -> bool:
    """
    Download video directly from Supabase Storage bucket

    """
    try:
        print(f"Downloading from Supabase bucket '{bucket_name}', path: '{file_path}'")
        
        # Download from Supabase Storage
        response = supabase.storage.from_(bucket_name).download(file_path)
        
        # Save to local file
        with open(output_path, 'wb') as f:
            f.write(response)
        
        file_size = len(response) / (1024 * 1024)
        print(f"Video downloaded successfully: {file_size:.2f} MB")
        return True
    
    except Exception as e:
        print(f"Error downloading from Supabase: {e}")
        return False


def download_video(video_url: str, output_path: str) -> bool:
    """
    Download video from URL to local path

    """
    try:
        print(f"Downloading video from: {video_url}")
        
        # Add headers to handle different URL types
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(video_url, stream=True, timeout=120, headers=headers, verify=True)
        response.raise_for_status()
        
        total_size = int(response.headers.get('content-length', 0))
        print(f"Video size: {total_size / (1024*1024):.2f} MB")
        
        downloaded = 0
        with open(output_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
                downloaded += len(chunk)
                if total_size > 0:
                    progress = (downloaded / total_size) * 100
                    if downloaded % (1024 * 1024) == 0:  # Print every MB
                        print(f"Downloaded: {progress:.1f}%")
        
        print(f"Video downloaded successfully to: {output_path}")
        return True
    
    except requests.exceptions.SSLError as e:
        print(f"SSL Error downloading video: {e}")
        print("Retrying without SSL verification...")
        try:
            response = requests.get(video_url, stream=True, timeout=120, headers=headers, verify=False)
            response.raise_for_status()
            with open(output_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            print(f"Video downloaded successfully (without SSL verification)")
            return True
        except Exception as retry_error:
            print(f"Retry failed: {retry_error}")
            return False
    except Exception as e:
        print(f"Error downloading video: {e}")
        import traceback
        traceback.print_exc()
        return False


def get_signed_url_from_storage_path(bucket_name: str, file_path: str, expiration: int = 604800) -> Optional[str]:
    """
    Generate a signed URL from a storage path (bucket and file path).
    Returns None if unable to generate signed URL.
    """
    try:
        service_client = get_service_role_client()
        signed_url_response = service_client.storage.from_(bucket_name).create_signed_url(
            file_path,
            expiration  # Default: 7 days
        )
        
        # Handle different response formats
        if isinstance(signed_url_response, dict):
            signed_url = (
                signed_url_response.get("signedURL") or
                signed_url_response.get("signed_url") or
                signed_url_response.get("url")
            )
        elif isinstance(signed_url_response, str):
            signed_url = signed_url_response
        else:
            signed_url = None
        
        return signed_url
    except Exception as e:
        print(f"Error generating signed URL for {bucket_name}/{file_path}: {e}")
        return None


def convert_url_to_signed_url(url: str, expiration: int = 604800) -> Optional[str]:
    """
    Convert a Supabase storage URL (public or signed) to a signed URL.
    Handles both public URLs and already-signed URLs.
    
    URL formats:
    - Public: https://xxx.supabase.co/storage/v1/object/public/BUCKET/PATH
    - Signed: https://xxx.supabase.co/storage/v1/object/sign/BUCKET/PATH?token=...
    """
    if not url or not isinstance(url, str):
        return url
    
    # If already a signed URL, return as-is (or optionally regenerate)
    if "/object/sign/" in url:
        return url  # Already signed, return as-is
    
    # Extract bucket and path from public URL
    # Format: https://xxx.supabase.co/storage/v1/object/public/BUCKET/PATH
    if "/storage/v1/object/public/" in url:
        parts = url.split("/storage/v1/object/public/")
        if len(parts) == 2:
            path_parts = parts[1].split("/", 1)
            if len(path_parts) == 2:
                bucket_name = path_parts[0]
                file_path = path_parts[1]
                # Remove query parameters if any
                file_path = file_path.split("?")[0]
                return get_signed_url_from_storage_path(bucket_name, file_path, expiration)
    
    # If not a Supabase URL, return as-is
    return url


def upload_to_supabase_storage(file_path: str, bucket_name: str, file_name: str) -> Optional[str]:
    """
    Upload file to Supabase Storage and return signed URL (for private buckets)

    """
    try:
        from connection_supabase_client import get_service_role_client
        
        print(f"Uploading to bucket '{bucket_name}' with filename '{file_name}'")
        
        with open(file_path, 'rb') as f:
            file_data = f.read()
        
        print(f"File size: {len(file_data)} bytes")
        
        # Use service role client for upload
        service_client = get_service_role_client()
        
        # Upload to Supabase Storage
        try:
            response = service_client.storage.from_(bucket_name).upload(
                file_name,
                file_data,
                file_options={"content-type": "image/jpeg", "upsert": "true"}
            )
            print(f"Upload response: {response}")
        except Exception as upload_error:
            print(f"Upload error details: {upload_error}")
            raise
        
        # Generate signed URL (valid for 7 days = 604800 seconds)
        try:
            signed_url_response = service_client.storage.from_(bucket_name).create_signed_url(
                file_name,
                604800  # 7 days expiration
            )
            
            # Handle different response formats
            if isinstance(signed_url_response, dict):
                signed_url = (
                    signed_url_response.get("signedURL") or
                    signed_url_response.get("signed_url") or
                    signed_url_response.get("url")
                )
            elif isinstance(signed_url_response, str):
                signed_url = signed_url_response
            else:
                signed_url = None
            
            if signed_url:
                print(f"Generated signed URL: {signed_url[:100]}...")
                return signed_url
            else:
                print(f"⚠️ Signed URL response format unexpected: {signed_url_response}")
                return None
        except Exception as signed_url_error:
            print(f"Error generating signed URL: {signed_url_error}")
            return None
    
    except Exception as e:
        print(f"Error uploading to Supabase: {e}")
        import traceback
        traceback.print_exc()
        return None

@router.post("/posts/create")
async def create_post(
    post_data: PostCreate,
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """
    Create a new post with video URL, thumbnail URL, and tags.
    Handles tag creation if tags don't exist, and links tags to post.
    If thumbnail_url is not provided or is a placeholder, generates thumbnail from video.
    """
    try:
        user_id = auth_data["user_id"]
        client = auth_data["client"]
        
        # Generate thumbnail if not provided or is placeholder
        thumbnail_url = post_data.thumbnail_url
        if not thumbnail_url or "_thumbnail.jpg" in thumbnail_url or "placeholder" in thumbnail_url.lower():
            print(f"📸 Generating thumbnail from video: {post_data.video_url}")
            try:
                # Download video temporarily
                temp_dir = tempfile.mkdtemp()
                temp_video_path = os.path.join(temp_dir, f"video_{uuid.uuid4()}.mp4")
                temp_thumbnail_path = os.path.join(temp_dir, f"thumbnail_{uuid.uuid4()}.jpg")
                
                # Download video
                if "supabase.co/storage/v1/object/sign/" in post_data.video_url:
                    # Signed URL - download directly
                    if not download_video(post_data.video_url, temp_video_path):
                        raise Exception("Failed to download video from signed URL")
                elif "supabase.co/storage/v1/object/public/" in post_data.video_url:
                    # Public URL - extract bucket and path
                    parts = post_data.video_url.split("/storage/v1/object/public/")
                    if len(parts) == 2:
                        path_parts = parts[1].split("/", 1)
                        if len(path_parts) == 2:
                            bucket_name = path_parts[0]
                            file_path = path_parts[1].split("?")[0]  # Remove query params
                            if not download_video_from_supabase(bucket_name, file_path, temp_video_path):
                                raise Exception("Failed to download video from Supabase")
                        else:
                            if not download_video(post_data.video_url, temp_video_path):
                                raise Exception("Failed to download video")
                    else:
                        if not download_video(post_data.video_url, temp_video_path):
                            raise Exception("Failed to download video")
                else:
                    if not download_video(post_data.video_url, temp_video_path):
                        raise Exception("Failed to download video")
                
                # Generate thumbnail
                if generate_thumbnail(temp_video_path, temp_thumbnail_path):
                    # Upload thumbnail to Supabase
                    thumbnail_filename = f"thumbnail_{uuid.uuid4()}.jpg"
                    thumbnail_url = upload_to_supabase_storage(
                        temp_thumbnail_path,
                        "thumbnails",
                        thumbnail_filename
                    )
                    print(f"✅ Thumbnail generated and uploaded: {thumbnail_url}")
                else:
                    print("⚠️ Failed to generate thumbnail, using placeholder")
                    thumbnail_url = post_data.thumbnail_url or ""
                
                # Cleanup
                try:
                    if os.path.exists(temp_video_path):
                        os.remove(temp_video_path)
                    if os.path.exists(temp_thumbnail_path):
                        os.remove(temp_thumbnail_path)
                    os.rmdir(temp_dir)
                except:
                    pass
            except Exception as thumb_error:
                print(f"⚠️ Error generating thumbnail: {thumb_error}")
                thumbnail_url = post_data.thumbnail_url or ""
        
        # Create post
        post_response = client.table("posts").insert({
            "user_id": user_id,
            "title": post_data.title,
            "description": post_data.description,
            "video_url": post_data.video_url,
            "thumbnail_url": thumbnail_url,
            "status": post_data.status,
            "transcript_url": post_data.transcript_url,
            "likes": 0,
            "views": 0
        }).execute()
        
        if not post_response.data:
            raise HTTPException(status_code=500, detail="Failed to create post")
        
        post_id = post_response.data[0]["id"]
        print(f"✅ Post created: {post_id}")
        
        # Handle tags
        tag_ids = []
        if post_data.tags and len(post_data.tags) > 0:
            for tag_name in post_data.tags:
                tag_name_lower = tag_name.strip().lower()
                if not tag_name_lower:
                    continue
                
                # Check if tag exists
                existing_tag = client.table("tags").select("id, usage_count").eq("name", tag_name_lower).execute()
                
                tag_id = None
                if existing_tag.data and len(existing_tag.data) > 0:
                    # Tag exists, get its ID and increment usage_count
                    tag_id = existing_tag.data[0]["id"]
                    current_count = existing_tag.data[0].get("usage_count", 0)
                    client.table("tags").update({
                        "usage_count": current_count + 1
                    }).eq("id", tag_id).execute()
                    print(f"✅ Tag '{tag_name_lower}' exists, linked to post")
                else:
                    # Create new tag
                    new_tag = client.table("tags").insert({
                        "name": tag_name_lower,
                        "usage_count": 1
                    }).execute()
                    if new_tag.data and len(new_tag.data) > 0:
                        tag_id = new_tag.data[0]["id"]
                        print(f"✅ New tag '{tag_name_lower}' created")
                
                # Link tag to post
                if tag_id:
                    client.table("post_tags").insert({
                        "post_id": post_id,
                        "tag_id": tag_id
                    }).execute()
                    tag_ids.append(tag_id)
        
        return {
            "success": True,
            "post_id": post_id,
            "tag_ids": tag_ids,
            "message": f"Post created successfully as {post_data.status}"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error creating post: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error creating post: {str(e)}")

@router.get("/posts")
def get_all_posts():
    """Get all posts with profiles and comments (DEPRECATED - use /posts/feed)"""
    response = supabase.table("posts").select(
        "*, profiles:user_id(id, full_name, username, profile_url), comments(*, profiles:user_id(id, full_name, username, profile_url))"
    ).order("created_at", desc=True).execute()
    return response.data


@router.get("/posts/user/{user_id}")
async def get_user_posts(
    user_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    auth_data: Optional[dict] = Depends(get_authenticated_supabase_client)
):
    """
    Get posts by a specific user with likes, comments, and views counts.
    Returns posts in chronological order (newest first).
    """
    try:
        if auth_data:
            client = auth_data["client"]
            current_user_id = auth_data["user_id"]
        else:
            client = supabase
            current_user_id = None

        # Calculate offset
        offset = (page - 1) * limit

        # Get posts by user
        posts_response = client.table("posts").select(
            "*, profiles:user_id(id, full_name, username, profile_url)"
        ).eq("user_id", user_id).order("created_at", desc=True).range(
            offset, offset + limit - 1
        ).execute()

        posts = posts_response.data

        # Get post IDs for fetching likes and comments
        post_ids = [post["id"] for post in posts]

        # Get likes count and check if current user liked each post
        likes_data = {}
        if post_ids:
            # Get all likes for these posts
            likes_response = client.table("post_likes").select("post_id, user_id").in_(
                "post_id", post_ids
            ).execute()

            # Count likes per post and check if current user liked
            for like in likes_response.data:
                post_id = like["post_id"]
                if post_id not in likes_data:
                    likes_data[post_id] = {"count": 0, "user_liked": False}
                likes_data[post_id]["count"] += 1
                if current_user_id and like["user_id"] == current_user_id:
                    likes_data[post_id]["user_liked"] = True

        # Get comments count for each post
        comments_data = {}
        if post_ids:
            comments_response = client.table("comments").select("post_id").in_(
                "post_id", post_ids
            ).execute()

            for comment in comments_response.data:
                post_id = comment["post_id"]
                comments_data[post_id] = comments_data.get(post_id, 0) + 1

        # Get recent comments (2 per post) for preview
        recent_comments = {}
        if post_ids:
            for post_id in post_ids:
                comments_preview = client.table("comments").select(
                    "*, profiles:user_id(id, full_name, username, profile_url)"
                ).eq("post_id", post_id).order("created_at", desc=True).limit(2).execute()
                if comments_preview.data:
                    recent_comments[post_id] = comments_preview.data

        # Combine data and generate signed URLs for videos and thumbnails
        enriched_posts = []
        for post in posts:
            post_id = post["id"]
            likes_info = likes_data.get(post_id, {"count": 0, "user_liked": False})

            # Generate signed URLs for video and thumbnail if they exist
            video_url = post.get("video_url")
            thumbnail_url = post.get("thumbnail_url")
            
            if video_url:
                video_url = convert_url_to_signed_url(video_url)
            if thumbnail_url:
                thumbnail_url = convert_url_to_signed_url(thumbnail_url)

            enriched_post = {
                **post,
                "video_url": video_url,
                "thumbnail_url": thumbnail_url,
                "likes": likes_info["count"],
                "likes_count": likes_info["count"],
                "user_liked": likes_info["user_liked"],
                "comments_count": comments_data.get(post_id, 0),
                "comments": recent_comments.get(post_id, []),
                "views": post.get("views", 0),
                "views_count": post.get("views", 0)
            }
            enriched_posts.append(enriched_post)

        # Get total count for pagination
        total_response = client.table("posts").select("id", count="exact").eq("user_id", user_id).execute()
        total_count = total_response.count if hasattr(total_response, 'count') else len(total_response.data)

        return {
            "success": True,
            "posts": enriched_posts,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_count,
                "total_pages": (total_count + limit - 1) // limit
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching user posts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/posts/feed")
async def get_feed(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """
    Get posts from users that the current user follows.
    Returns posts in chronological order (newest first).
    """
    try:
        user_id = auth_data["user_id"]
        client = auth_data["client"]
        
        # Calculate offset
        offset = (page - 1) * limit
        
        # Get list of users that current user follows (accepted status only)
        follows_response = client.table("follows").select("following_id").eq(
            "follower_id", user_id
        ).eq("status", "accepted").execute()
        
        following_ids = [f["following_id"] for f in follows_response.data]
        
        # If user follows no one, return empty feed
        if not following_ids:
            return {
                "success": True,
                "posts": [],
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": 0,
                    "total_pages": 0
                }
            }
        
        # Get posts from followed users
        posts_response = client.table("posts").select(
            "*, profiles:user_id(id, full_name, username, profile_url)"
        ).in_("user_id", following_ids).order("created_at", desc=True).range(
            offset, offset + limit - 1
        ).execute()
        
        posts = posts_response.data
        
        # Get post IDs for fetching likes and comments
        post_ids = [post["id"] for post in posts]
        
        # Get likes count and check if current user liked each post
        likes_data = {}
        if post_ids:
            # Get all likes for these posts
            likes_response = client.table("post_likes").select("post_id, user_id").in_(
                "post_id", post_ids
            ).execute()
            
            # Count likes per post and check if current user liked
            for like in likes_response.data:
                post_id = like["post_id"]
                if post_id not in likes_data:
                    likes_data[post_id] = {"count": 0, "user_liked": False}
                likes_data[post_id]["count"] += 1
                if like["user_id"] == user_id:
                    likes_data[post_id]["user_liked"] = True
        
        # Get comments count for each post
        comments_data = {}
        if post_ids:
            comments_response = client.table("comments").select("post_id").in_(
                "post_id", post_ids
            ).execute()
            
            for comment in comments_response.data:
                post_id = comment["post_id"]
                comments_data[post_id] = comments_data.get(post_id, 0) + 1
        
        # Get recent comments (2 per post) for preview
        recent_comments = {}
        if post_ids:
            for post_id in post_ids:
                comments_preview = client.table("comments").select(
                    "*, profiles:user_id(id, full_name, username, profile_url)"
                ).eq("post_id", post_id).order("created_at", desc=True).limit(2).execute()
                if comments_preview.data:
                    recent_comments[post_id] = comments_preview.data
        
        # Combine data and generate signed URLs for videos and thumbnails
        enriched_posts = []
        for post in posts:
            post_id = post["id"]
            likes_info = likes_data.get(post_id, {"count": post.get("likes", 0), "user_liked": False})
            
            # Generate signed URLs for video and thumbnail if they exist
            video_url = post.get("video_url")
            thumbnail_url = post.get("thumbnail_url")
            
            if video_url:
                video_url = convert_url_to_signed_url(video_url)
            if thumbnail_url:
                thumbnail_url = convert_url_to_signed_url(thumbnail_url)
            
            enriched_post = {
                **post,
                "video_url": video_url,
                "thumbnail_url": thumbnail_url,
                "likes": likes_info["count"],
                "likes_count": likes_info["count"],  # Add for consistency
                "user_liked": likes_info["user_liked"],
                "comments_count": comments_data.get(post_id, 0),
                "comments": recent_comments.get(post_id, []),
                "views": post.get("views", 0),
                "views_count": post.get("views", 0)  # Add for consistency
            }
            enriched_posts.append(enriched_post)
        
        # Get total count for pagination
        total_response = client.table("posts").select("id", count="exact").in_(
            "user_id", following_ids
        ).execute()
        total_count = total_response.count if hasattr(total_response, 'count') else len(total_response.data)
        
        return {
            "success": True,
            "posts": enriched_posts,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_count,
                "total_pages": (total_count + limit - 1) // limit
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching feed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/posts/generate-thumbnails")
def generate_thumbnails_for_all_posts(timestamp: str = "00:00:03"):
    """
    TEST ENDPOINT: Generate thumbnails for all existing posts
    Fetches videos from post table, generates thumbnails, and updates database

    """
    try:
        # Fetch all posts
        response = supabase.table("posts").select("id, video_url, thumbnail_url").execute()
        posts = response.data
        
        if not posts:
            return {"message": "No posts found", "results": []}
        
        results = []
        temp_dir = tempfile.mkdtemp()
        
        for post in posts:
            post_id = post['id']
            video_url = post.get('video_url')
            
            if not video_url:
                results.append({
                    "post_id": post_id,
                    "status": "skipped",
                    "message": "No video URL found"
                })
                continue
            
            try:
                # Create temporary file paths
                temp_video_path = os.path.join(temp_dir, f"video_{post_id}.mp4")
                temp_thumbnail_path = os.path.join(temp_dir, f"thumbnail_{post_id}.jpg")
                
                # Check if video URL is from Supabase Storage
                if "supabase.co/storage/v1/object/public/" in video_url:
                    # Extract bucket and file path from URL
                    # URL format: https://xxx.supabase.co/storage/v1/object/public/BUCKET/PATH
                    parts = video_url.split("/storage/v1/object/public/")
                    if len(parts) == 2:
                        path_parts = parts[1].split("/", 1)
                        if len(path_parts) == 2:
                            bucket_name = path_parts[0]
                            file_path = path_parts[1]
                            print(f"Detected Supabase Storage - Bucket: {bucket_name}, Path: {file_path}")
                            
                            if not download_video_from_supabase(bucket_name, file_path, temp_video_path):
                                results.append({
                                    "post_id": post_id,
                                    "status": "failed",
                                    "message": "Failed to download video from Supabase Storage"
                                })
                                continue
                        else:
                            print("Could not parse Supabase URL, falling back to direct download")
                            if not download_video(video_url, temp_video_path):
                                results.append({
                                    "post_id": post_id,
                                    "status": "failed",
                                    "message": "Failed to download video"
                                })
                                continue
                    else:
                        print("Could not parse Supabase URL, falling back to direct download")
                        if not download_video(video_url, temp_video_path):
                            results.append({
                                "post_id": post_id,
                                "status": "failed",
                                "message": "Failed to download video"
                            })
                            continue
                else:
                    # Regular HTTP download
                    print(f"Processing post {post_id}...")
                    if not download_video(video_url, temp_video_path):
                        results.append({
                            "post_id": post_id,
                            "status": "failed",
                            "message": "Failed to download video"
                        })
                        continue
                
                # Generate thumbnail
                if not generate_thumbnail(temp_video_path, temp_thumbnail_path, timestamp):
                    results.append({
                        "post_id": post_id,
                        "status": "failed",
                        "message": "Failed to generate thumbnail"
                    })
                    continue
                
                # Upload thumbnail to Supabase Storage
                thumbnail_filename = f"thumbnail_{post_id}_{uuid.uuid4()}.jpg"
                thumbnail_url = upload_to_supabase_storage(
                    temp_thumbnail_path,
                    "thumbnails",  # Make sure this bucket exists in Supabase
                    thumbnail_filename
                )
                
                if not thumbnail_url:
                    results.append({
                        "post_id": post_id,
                        "status": "failed",
                        "message": "Failed to upload thumbnail to storage"
                    })
                    continue
                
                # Update post with thumbnail URL
                update_response = supabase.table("posts").update({
                    "thumbnail_url": thumbnail_url
                }).eq("id", post_id).execute()
                
                results.append({
                    "post_id": post_id,
                    "status": "success",
                    "thumbnail_url": thumbnail_url,
                    "message": "Thumbnail generated and saved successfully"
                })
                
                # Cleanup temp files for this post
                if os.path.exists(temp_video_path):
                    os.remove(temp_video_path)
                if os.path.exists(temp_thumbnail_path):
                    os.remove(temp_thumbnail_path)
                
            except Exception as e:
                results.append({
                    "post_id": post_id,
                    "status": "error",
                    "message": str(e)
                })
        
        # Cleanup temp directory
        try:
            os.rmdir(temp_dir)
        except:
            pass
        
        # Summary
        success_count = sum(1 for r in results if r["status"] == "success")
        failed_count = len(results) - success_count
        
        return {
            "message": "Thumbnail generation completed",
            "summary": {
                "total_posts": len(posts),
                "successful": success_count,
                "failed": failed_count
            },
            "results": results
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("/posts/{post_id}/generate-thumbnail")
def generate_thumbnail_for_single_post(post_id: str, timestamp: str = "00:00:03"):
    """
    TEST ENDPOINT: Generate thumbnail for a single post
    
    Args:
        post_id: UUID of the post
        timestamp: Time in video to capture thumbnail (default: 00:00:03)
    
    Returns:
        dict: Result of thumbnail generation
    """
    temp_video_path = None
    temp_thumbnail_path = None
    
    try:
        # Fetch post
        response = supabase.table("posts").select("id, video_url").eq("id", post_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Post not found")
        
        post = response.data[0]
        video_url = post.get('video_url')
        
        if not video_url:
            raise HTTPException(status_code=400, detail="Post has no video URL")
        
        # Create temporary directory and file paths
        temp_dir = tempfile.mkdtemp()
        temp_video_path = os.path.join(temp_dir, f"video_{post_id}.mp4")
        temp_thumbnail_path = os.path.join(temp_dir, f"thumbnail_{post_id}.jpg")
        
        # Check if video URL is from Supabase Storage
        if "supabase.co/storage/v1/object/public/" in video_url:
            # Extract bucket and file path from URL
            parts = video_url.split("/storage/v1/object/public/")
            if len(parts) == 2:
                path_parts = parts[1].split("/", 1)
                if len(path_parts) == 2:
                    bucket_name = path_parts[0]
                    file_path = path_parts[1]
                    print(f"Detected Supabase Storage - Bucket: {bucket_name}, Path: {file_path}")
                    
                    if not download_video_from_supabase(bucket_name, file_path, temp_video_path):
                        raise HTTPException(status_code=500, detail="Failed to download video from Supabase Storage")
                else:
                    if not download_video(video_url, temp_video_path):
                        raise HTTPException(status_code=500, detail="Failed to download video")
            else:
                if not download_video(video_url, temp_video_path):
                    raise HTTPException(status_code=500, detail="Failed to download video")
        else:
            # Download video
            print(f"Downloading video from: {video_url}")
            if not download_video(video_url, temp_video_path):
                raise HTTPException(status_code=500, detail="Failed to download video")
        
        # Generate thumbnail
        print(f"Generating thumbnail at timestamp: {timestamp}")
        if not generate_thumbnail(temp_video_path, temp_thumbnail_path, timestamp):
            raise HTTPException(status_code=500, detail="Failed to generate thumbnail")
        
        # Upload thumbnail to Supabase Storage
        thumbnail_filename = f"thumbnail_{post_id}_{uuid.uuid4()}.jpg"
        thumbnail_url = upload_to_supabase_storage(
            temp_thumbnail_path,
            "thumbnails",
            thumbnail_filename
        )
        
        if not thumbnail_url:
            raise HTTPException(status_code=500, detail="Failed to upload thumbnail")
        
        # Update post with thumbnail URL
        update_response = supabase.table("posts").update({
            "thumbnail_url": thumbnail_url
        }).eq("id", post_id).execute()
        
        return {
            "success": True,
            "post_id": post_id,
            "thumbnail_url": thumbnail_url,
            "message": "Thumbnail generated and saved successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        # Cleanup temporary files
        if temp_video_path and os.path.exists(temp_video_path):
            os.remove(temp_video_path)
        if temp_thumbnail_path and os.path.exists(temp_thumbnail_path):
            os.remove(temp_thumbnail_path)


# ==================== Like/Unlike Endpoints ====================

@router.post("/posts/{post_id}/like")
async def like_post(
    post_id: str,
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """Like a post"""
    try:
        user_id = auth_data["user_id"]
        client = auth_data["client"]
        
        # Check if post exists
        post_response = client.table("posts").select("id, likes").eq("id", post_id).execute()
        if not post_response.data:
            raise HTTPException(status_code=404, detail="Post not found")
        
        # Check if already liked
        existing_like = client.table("post_likes").select("id").eq(
            "post_id", post_id
        ).eq("user_id", user_id).execute()
        
        if existing_like.data:
            raise HTTPException(status_code=400, detail="Post already liked")
        
        # Add like
        client.table("post_likes").insert({
            "post_id": post_id,
            "user_id": user_id
        }).execute()
        
        # Update cached likes count
        current_likes = post_response.data[0].get("likes", 0)
        client.table("posts").update({
            "likes": current_likes + 1
        }).eq("id", post_id).execute()
        
        return {
            "success": True,
            "liked": True,
            "likes_count": current_likes + 1
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error liking post: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/posts/{post_id}/like")
async def unlike_post(
    post_id: str,
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """Unlike a post"""
    try:
        user_id = auth_data["user_id"]
        client = auth_data["client"]
        
        # Check if like exists
        existing_like = client.table("post_likes").select("id").eq(
            "post_id", post_id
        ).eq("user_id", user_id).execute()
        
        if not existing_like.data:
            raise HTTPException(status_code=400, detail="Post not liked")
        
        # Remove like
        client.table("post_likes").delete().eq(
            "post_id", post_id
        ).eq("user_id", user_id).execute()
        
        # Update cached likes count
        post_response = client.table("posts").select("likes").eq("id", post_id).execute()
        if post_response.data:
            current_likes = post_response.data[0].get("likes", 0)
            client.table("posts").update({
                "likes": max(0, current_likes - 1)
            }).eq("id", post_id).execute()
            
            return {
                "success": True,
                "liked": False,
                "likes_count": max(0, current_likes - 1)
            }
        
        return {
            "success": True,
            "liked": False,
            "likes_count": 0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error unliking post: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Comment Endpoints ====================

@router.post("/posts/{post_id}/comments")
async def add_comment(
    post_id: str,
    comment: CommentCreate,
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """Add a comment to a post"""
    try:
        user_id = auth_data["user_id"]
        client = auth_data["client"]
        
        # Validate post_id matches
        if comment.post_id != post_id:
            raise HTTPException(status_code=400, detail="Post ID mismatch")
        
        # Check if post exists
        post_response = client.table("posts").select("id").eq("id", post_id).execute()
        if not post_response.data:
            raise HTTPException(status_code=404, detail="Post not found")
        
        # Add comment
        comment_response = client.table("comments").insert({
            "post_id": post_id,
            "user_id": user_id,
            "content": comment.content
        }).execute()
        
        if not comment_response.data:
            raise HTTPException(status_code=500, detail="Failed to add comment")
        
        # Get comment with user profile
        new_comment = comment_response.data[0]
        comment_with_profile = client.table("comments").select(
            "*, profiles:user_id(id, full_name, username, profile_url)"
        ).eq("id", new_comment["id"]).single().execute()
        
        return {
            "success": True,
            "comment": comment_with_profile.data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error adding comment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/posts/{post_id}/comments")
async def get_comments(
    post_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    auth_data: Optional[dict] = Depends(get_authenticated_supabase_client)
):
    """Get comments for a post"""
    try:
        if auth_data:
            client = auth_data["client"]
        else:
            client = supabase
        
        offset = (page - 1) * limit
        
        # Get comments with user profiles
        comments_response = client.table("comments").select(
            "*, profiles:user_id(id, full_name, username, profile_url)"
        ).eq("post_id", post_id).order("created_at", desc=True).range(
            offset, offset + limit - 1
        ).execute()
        
        # Get total count
        total_response = client.table("comments").select("id", count="exact").eq(
            "post_id", post_id
        ).execute()
        total_count = total_response.count if hasattr(total_response, 'count') else len(total_response.data)
        
        return {
            "success": True,
            "comments": comments_response.data,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_count,
                "total_pages": (total_count + limit - 1) // limit
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching comments: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== View Tracking ====================

@router.post("/posts/{post_id}/view")
async def track_view(
    post_id: str,
    auth_data: Optional[dict] = Depends(get_authenticated_supabase_client)
):
    """
    Track a view for a post (one view per user per post).
    Approach 2: Only counts if user hasn't viewed before.
    """
    try:
        if auth_data:
            client = auth_data["client"]
            user_id = auth_data["user_id"]
        else:
            client = supabase
            user_id = None
        
        # Check if post exists
        post_response = client.table("posts").select("id, views").eq("id", post_id).execute()
        if not post_response.data:
            raise HTTPException(status_code=404, detail="Post not found")
        
        # If user is logged in, check if they already viewed this post
        if user_id:
            existing_view = client.table("post_views").select("id").eq(
                "post_id", post_id
            ).eq("user_id", user_id).execute()
            
            if existing_view.data:
                # User already viewed, return current count without incrementing
                current_views = post_response.data[0].get("views", 0)
                return {
                    "success": True,
                    "viewed": True,
                    "views": current_views,
                    "message": "Already viewed"
                }
            
            # User hasn't viewed yet - insert into post_views table
            try:
                client.table("post_views").insert({
                    "post_id": post_id,
                    "user_id": user_id
                }).execute()
            except Exception as insert_error:
                # If insert fails (e.g., race condition), check again
                existing_view_retry = client.table("post_views").select("id").eq(
                    "post_id", post_id
                ).eq("user_id", user_id).execute()
                
                if existing_view_retry.data:
                    # Already viewed (race condition handled)
                    current_views = post_response.data[0].get("views", 0)
                    return {
                        "success": True,
                        "viewed": True,
                        "views": current_views,
                        "message": "Already viewed"
                    }
                else:
                    raise insert_error
            
            # Update cached views count in posts table
            current_views = post_response.data[0].get("views", 0)
            client.table("posts").update({
                "views": current_views + 1
            }).eq("id", post_id).execute()
            
            return {
                "success": True,
                "viewed": True,
                "views": current_views + 1,
                "message": "View recorded"
            }
        else:
            # Anonymous user - just increment count (no tracking)
            current_views = post_response.data[0].get("views", 0)
            client.table("posts").update({
                "views": current_views + 1
            }).eq("id", post_id).execute()
            
            return {
                "success": True,
                "viewed": True,
                "views": current_views + 1,
                "message": "View recorded (anonymous)"
            }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error tracking view: {e}")
        raise HTTPException(status_code=500, detail=str(e))