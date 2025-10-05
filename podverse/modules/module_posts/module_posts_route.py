from fastapi import APIRouter, HTTPException
from connection_supabase_client import supabase
import subprocess
import os
import tempfile
import uuid
import requests
from typing import Optional

router = APIRouter()

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


def upload_to_supabase_storage(file_path: str, bucket_name: str, file_name: str) -> Optional[str]:
    """
    Upload file to Supabase Storage

    """
    try:
        print(f"Uploading to bucket '{bucket_name}' with filename '{file_name}'")
        
        with open(file_path, 'rb') as f:
            file_data = f.read()
        
        print(f"File size: {len(file_data)} bytes")
        
        # Upload to Supabase Storage
        try:
            response = supabase.storage.from_(bucket_name).upload(
                file_name,
                file_data,
                file_options={"content-type": "image/jpeg", "upsert": "true"}
            )
            print(f"Upload response: {response}")
        except Exception as upload_error:
            print(f"Upload error details: {upload_error}")
            # If bucket doesn't exist, try to create it
            print("Attempting to create bucket...")
            try:
                supabase.storage.create_bucket(bucket_name, {"public": True})
                print(f"Bucket '{bucket_name}' created successfully")
                # Retry upload
                response = supabase.storage.from_(bucket_name).upload(
                    file_name,
                    file_data,
                    file_options={"content-type": "image/jpeg", "upsert": "true"}
                )
            except Exception as create_error:
                print(f"Bucket creation error: {create_error}")
                raise
        
        # Get public URL
        public_url = supabase.storage.from_(bucket_name).get_public_url(file_name)
        print(f"Generated public URL: {public_url}")
        return public_url
    
    except Exception as e:
        print(f"Error uploading to Supabase: {e}")
        import traceback
        traceback.print_exc()
        return None


@router.get("/posts")
def get_all_posts():
    """Get all posts with profiles and comments"""
    response = supabase.table("posts").select(
        "*, profiles(full_name), comments(*, profiles(full_name))"
    ).order("created_at", desc=True).execute()
    return response.data


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