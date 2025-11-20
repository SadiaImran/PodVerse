from fastapi import APIRouter, HTTPException, Depends, Form, File, UploadFile, Query
from typing import Optional
from connection_supabase_client import supabase, get_authenticated_supabase_client

router = APIRouter()

# ==================== Profile Endpoints ====================

@router.post("/upload-profile-image")
async def upload_profile_image(
    file: UploadFile = File(...),
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """Upload profile image to storage and return the URL"""
    try:
        user_id = auth_data["user_id"]
        client = auth_data["client"]
        
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read file data
        file_data = await file.read()
        if len(file_data) == 0:
            raise HTTPException(status_code=400, detail="File is empty")
        
        # Validate file size (max 5MB)
        if len(file_data) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Image size must be less than 5MB")
        
        # Get file extension
        file_ext = file.filename.split('.')[-1] if '.' in file.filename else ''
        
        # Format: user_id_profile_image.extension
        file_name = f"{user_id}_profile_image.{file_ext}" if file_ext else f"{user_id}_profile_image"
        
        # Upload to Supabase Storage
        try:
            upload_result = client.storage.from_("profiles").upload(
                file_name,
                file_data,
                file_options={"content-type": file.content_type, "upsert": "true"}
            )
        except Exception as e:
            print(f"[upload-profile-image] Storage upload failed: {e}")
            raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
        
        # Get public URL
        public_url = client.storage.from_("profiles").get_public_url(file_name)
        
        return {
            "success": True,
            "url": public_url,
            "file_name": file_name
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error uploading profile image: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload-cover-image")
async def upload_cover_image(
    file: UploadFile = File(...),
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """Upload cover image to storage and return the URL"""
    try:
        user_id = auth_data["user_id"]
        client = auth_data["client"]
        
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read file data
        file_data = await file.read()
        if len(file_data) == 0:
            raise HTTPException(status_code=400, detail="File is empty")
        
        # Validate file size (max 5MB)
        if len(file_data) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Image size must be less than 5MB")
        
        # Get file extension
        file_ext = file.filename.split('.')[-1] if '.' in file.filename else ''
        
        # Format: user_id_cover_image.extension
        file_name = f"{user_id}_cover_image.{file_ext}" if file_ext else f"{user_id}_cover_image"
        
        # Upload to Supabase Storage
        try:
            upload_result = client.storage.from_("profiles").upload(
                file_name,
                file_data,
                file_options={"content-type": file.content_type, "upsert": "true"}
            )
        except Exception as e:
            print(f"[upload-cover-image] Storage upload failed: {e}")
            raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
        
        # Get public URL
        public_url = client.storage.from_("profiles").get_public_url(file_name)
        
        return {
            "success": True,
            "url": public_url,
            "file_name": file_name
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error uploading cover image: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create-profile")
async def create_profile(
    full_name: str = Form(...),
    username: str = Form(...),
    bio: Optional[str] = Form(None),
    profile_image: Optional[UploadFile] = File(None),
    cover_image: Optional[UploadFile] = File(None),
    profile_url: Optional[str] = Form(None),  # For Google avatar URL if no file uploaded
    is_private: bool = Form(False),
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """Create user profile (onboarding) - Uploads images if provided and creates profile"""
    try:
        user_id = auth_data["user_id"]
        client = auth_data["client"]
        
        # Get user email from auth_data (should be available from dependency)
        user_email = auth_data.get("user_email")
        # If not available, try to get from auth as fallback
        if not user_email:
            try:
                user_response = client.auth.get_user()
                if user_response and hasattr(user_response, 'user') and user_response.user:
                    user_email = user_response.user.email
            except Exception as e:
                print(f"[create-profile] Error getting user email: {e}")
                # Try one more time with the token
                try:
                    # Get from the JWT token directly if available
                    user_email = None
                except:
                    pass
        
        # Ensure we have an email - it's required
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found. Please ensure you are logged in.")
        
        # Check if profile already exists
        existing = client.table("profiles").select("id, onboarding_complete").eq("id", user_id).execute()
        
        # If profile exists and onboarding is already complete, don't allow creating again
        if existing.data and existing.data[0].get("onboarding_complete") == True:
            raise HTTPException(status_code=400, detail="Profile already exists and onboarding is complete")
        
        # Check if username is already taken by another user (not the current user)
        username_check = client.table("profiles").select("id").eq("username", username.lower()).neq("id", user_id).execute()
        if username_check.data:
            raise HTTPException(status_code=400, detail="Username already taken")
        
        # Upload profile image if provided, otherwise use profile_url (e.g., Google avatar)
        final_profile_url = profile_url if profile_url else None  # Use provided URL (e.g., Google avatar) as default
        if profile_image and profile_image.filename:
            try:
                # Validate file type
                if not profile_image.content_type or not profile_image.content_type.startswith('image/'):
                    raise HTTPException(status_code=400, detail="Profile image must be an image file")
                
                # Read file data
                file_data = await profile_image.read()
                if len(file_data) == 0:
                    raise HTTPException(status_code=400, detail="Profile image file is empty")
                
                # Validate file size (max 5MB)
                if len(file_data) > 5 * 1024 * 1024:
                    raise HTTPException(status_code=400, detail="Profile image size must be less than 5MB")
                
                # Get file extension
                file_ext = profile_image.filename.split('.')[-1] if '.' in profile_image.filename else ''
                
                # Format: user_id_profile_image.extension
                file_name = f"{user_id}_profile_image.{file_ext}" if file_ext else f"{user_id}_profile_image"
                
                # Upload to Supabase Storage
                client.storage.from_("profiles").upload(
                    file_name,
                    file_data,
                    file_options={"content-type": profile_image.content_type, "upsert": "true"}
                )
                
                # Get public URL
                final_profile_url = client.storage.from_("profiles").get_public_url(file_name)
                print(f"[create-profile] Profile image uploaded: {final_profile_url}")
            except HTTPException:
                raise
            except Exception as e:
                print(f"[create-profile] Error uploading profile image: {e}")
                raise HTTPException(status_code=500, detail=f"Failed to upload profile image: {str(e)}")
        
        # Upload cover image if provided
        cover_image_url = None
        if cover_image and cover_image.filename:
            try:
                # Validate file type
                if not cover_image.content_type or not cover_image.content_type.startswith('image/'):
                    raise HTTPException(status_code=400, detail="Cover image must be an image file")
                
                # Read file data
                file_data = await cover_image.read()
                if len(file_data) == 0:
                    raise HTTPException(status_code=400, detail="Cover image file is empty")
                
                # Validate file size (max 5MB)
                if len(file_data) > 5 * 1024 * 1024:
                    raise HTTPException(status_code=400, detail="Cover image size must be less than 5MB")
                
                # Get file extension
                file_ext = cover_image.filename.split('.')[-1] if '.' in cover_image.filename else ''
                
                # Format: user_id_cover_image.extension
                file_name = f"{user_id}_cover_image.{file_ext}" if file_ext else f"{user_id}_cover_image"
                
                # Upload to Supabase Storage
                client.storage.from_("profiles").upload(
                    file_name,
                    file_data,
                    file_options={"content-type": cover_image.content_type, "upsert": "true"}
                )
                
                # Get public URL
                cover_image_url = client.storage.from_("profiles").get_public_url(file_name)
                print(f"[create-profile] Cover image uploaded: {cover_image_url}")
            except HTTPException:
                raise
            except Exception as e:
                print(f"[create-profile] Error uploading cover image: {e}")
                raise HTTPException(status_code=500, detail=f"Failed to upload cover image: {str(e)}")
        
        # Prepare profile data (email already fetched above)
        profile_data = {
            "email": user_email,
            "full_name": full_name.strip(),
            "username": username.lower().strip(),
            "bio": bio.strip() if bio else None,
            "profile_url": final_profile_url,
            "cover_image_url": cover_image_url,
            "is_private": is_private,
            "onboarding_complete": True,  # Set to true after onboarding is complete
        }
        
        # If profile already exists (but onboarding_complete = false), update it
        # Otherwise, insert new profile
        if existing.data:
            # Update existing profile
            result = client.table("profiles").update(profile_data).eq("id", user_id).execute()
        else:
            # Insert new profile
            profile_data["id"] = user_id
            profile_data["followers_count"] = 0
            profile_data["following_count"] = 0
            result = client.table("profiles").insert(profile_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=400, detail="Failed to create/update profile")
        
        return {
            "success": True, 
            "profile": result.data[0],
            "profile_url": final_profile_url,
            "cover_image_url": cover_image_url
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/profile/me")
async def get_my_profile(auth_data: dict = Depends(get_authenticated_supabase_client)):
    """Get current user's profile"""
    try:
        user_id = auth_data["user_id"]
        client = auth_data["client"]
        
        response = client.table("profiles").select("*").eq("id", user_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        return {"profile": response.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/profile/{user_id}")
async def get_profile_by_id(user_id: str, auth_data: Optional[dict] = Depends(get_authenticated_supabase_client)):
    """Get profile by user ID"""
    try:
        # Use authenticated client if available, otherwise use public client
        if auth_data:
            client = auth_data["client"]
            current_user_id = auth_data["user_id"]
        else:
            client = supabase
            current_user_id = None
        
        response = client.table("profiles").select("*").eq("id", user_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        profile = response.data[0]
        
        # Check connection status (following, pending, or none)
        if current_user_id and current_user_id != user_id:
            follow_check = client.table("follows").select("id, status").eq("follower_id", current_user_id).eq("following_id", user_id).execute()
            if follow_check.data:
                connection = follow_check.data[0]
                if connection.get("status") == "accepted":
                    profile["is_following"] = True
                    profile["connection_status"] = "following"
                elif connection.get("status") == "pending":
                    profile["is_following"] = "pending"
                    profile["connection_status"] = "pending"
                else:
                    profile["is_following"] = False
                    profile["connection_status"] = "none"
            else:
                profile["is_following"] = False
                profile["connection_status"] = "none"
        else:
            profile["is_following"] = False
            profile["connection_status"] = "none"
        
        return {"profile": profile}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/profile/username/{username}")
async def get_profile_by_username(username: str, auth_data: Optional[dict] = Depends(get_authenticated_supabase_client)):
    """Get profile by username"""
    try:
        # Use authenticated client if available, otherwise use public client
        if auth_data:
            client = auth_data["client"]
            current_user_id = auth_data["user_id"]
        else:
            client = supabase
            current_user_id = None
        
        response = client.table("profiles").select("*").eq("username", username.lower()).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        profile = response.data[0]
        
        # Check connection status (following, pending, or none)
        if current_user_id and current_user_id != profile["id"]:
            follow_check = client.table("follows").select("id, status").eq("follower_id", current_user_id).eq("following_id", profile["id"]).execute()
            if follow_check.data:
                connection = follow_check.data[0]
                if connection.get("status") == "accepted":
                    profile["is_following"] = True
                    profile["connection_status"] = "following"
                elif connection.get("status") == "pending":
                    profile["is_following"] = "pending"
                    profile["connection_status"] = "pending"
                else:
                    profile["is_following"] = False
                    profile["connection_status"] = "none"
            else:
                profile["is_following"] = False
                profile["connection_status"] = "none"
        else:
            profile["is_following"] = False
            profile["connection_status"] = "none"
        
        return {"profile": profile}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/update-profile")
async def update_profile(
    full_name: Optional[str] = Form(None),
    username: Optional[str] = Form(None),
    bio: Optional[str] = Form(None),
    profile_image: Optional[UploadFile] = File(None),
    cover_image: Optional[UploadFile] = File(None),
    profile_url: Optional[str] = Form(None),  # For URL if no file uploaded
    cover_image_url: Optional[str] = Form(None),  # For URL if no file uploaded
    is_private: Optional[bool] = Form(None),
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """Update current user's profile - Uploads images if provided and updates profile"""
    try:
        user_id = auth_data["user_id"]
        client = auth_data["client"]
        
        # Build update dict (only include provided fields)
        update_data = {}
        
        if full_name is not None:
            update_data["full_name"] = full_name.strip()
        
        if username is not None:
            # Check if username is already taken by another user
            username_check = client.table("profiles").select("id").eq("username", username.lower()).neq("id", user_id).execute()
            if username_check.data:
                raise HTTPException(status_code=400, detail="Username already taken")
            update_data["username"] = username.lower().strip()
        
        if bio is not None:
            update_data["bio"] = bio.strip() if bio else None
        
        # Upload profile image if provided, otherwise use profile_url
        if profile_image and profile_image.filename:
            try:
                # Validate file type
                if not profile_image.content_type or not profile_image.content_type.startswith('image/'):
                    raise HTTPException(status_code=400, detail="Profile image must be an image file")
                
                # Read file data
                file_data = await profile_image.read()
                if len(file_data) == 0:
                    raise HTTPException(status_code=400, detail="Profile image file is empty")
                
                # Validate file size (max 5MB)
                if len(file_data) > 5 * 1024 * 1024:
                    raise HTTPException(status_code=400, detail="Profile image size must be less than 5MB")
                
                # Get file extension
                file_ext = profile_image.filename.split('.')[-1] if '.' in profile_image.filename else ''
                
                # Format: user_id_profile_image.extension
                file_name = f"{user_id}_profile_image.{file_ext}" if file_ext else f"{user_id}_profile_image"
                
                # Upload to Supabase Storage
                client.storage.from_("profiles").upload(
                    file_name,
                    file_data,
                    file_options={"content-type": profile_image.content_type, "upsert": "true"}
                )
                
                # Get public URL
                final_profile_url = client.storage.from_("profiles").get_public_url(file_name)
                update_data["profile_url"] = final_profile_url
                print(f"[update-profile] Profile image uploaded: {final_profile_url}")
            except HTTPException:
                raise
            except Exception as e:
                print(f"[update-profile] Error uploading profile image: {e}")
                raise HTTPException(status_code=500, detail=f"Failed to upload profile image: {str(e)}")
        elif profile_url is not None:
            # Use provided URL if no file uploaded
            update_data["profile_url"] = profile_url
        
        # Upload cover image if provided, otherwise use cover_image_url
        if cover_image and cover_image.filename:
            try:
                # Validate file type
                if not cover_image.content_type or not cover_image.content_type.startswith('image/'):
                    raise HTTPException(status_code=400, detail="Cover image must be an image file")
                
                # Read file data
                file_data = await cover_image.read()
                if len(file_data) == 0:
                    raise HTTPException(status_code=400, detail="Cover image file is empty")
                
                # Validate file size (max 5MB)
                if len(file_data) > 5 * 1024 * 1024:
                    raise HTTPException(status_code=400, detail="Cover image size must be less than 5MB")
                
                # Get file extension
                file_ext = cover_image.filename.split('.')[-1] if '.' in cover_image.filename else ''
                
                # Format: user_id_cover_image.extension
                file_name = f"{user_id}_cover_image.{file_ext}" if file_ext else f"{user_id}_cover_image"
                
                # Upload to Supabase Storage
                client.storage.from_("profiles").upload(
                    file_name,
                    file_data,
                    file_options={"content-type": cover_image.content_type, "upsert": "true"}
                )
                
                # Get public URL
                cover_image_url_final = client.storage.from_("profiles").get_public_url(file_name)
                update_data["cover_image_url"] = cover_image_url_final
                print(f"[update-profile] Cover image uploaded: {cover_image_url_final}")
            except HTTPException:
                raise
            except Exception as e:
                print(f"[update-profile] Error uploading cover image: {e}")
                raise HTTPException(status_code=500, detail=f"Failed to upload cover image: {str(e)}")
        elif cover_image_url is not None:
            # Use provided URL if no file uploaded
            update_data["cover_image_url"] = cover_image_url
        
        if is_private is not None:
            update_data["is_private"] = is_private
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Update profile
        result = client.table("profiles").update(update_data).eq("id", user_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        return {"success": True, "profile": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/search")
async def search_users(
    query: str = Query(..., min_length=1, description="Search query (username or full name)"),
    limit: int = Query(20, ge=1, le=50),
    auth_data: Optional[dict] = Depends(get_authenticated_supabase_client)
):
    """Search for users by username or full name"""
    try:
        if auth_data:
            client = auth_data["client"]
            current_user_id = auth_data["user_id"]
        else:
            client = supabase
            current_user_id = None
        
        # Normalize query
        search_query = query.strip().lower()
        
        # Search in both username and full_name (case-insensitive)
        # Get profiles matching username
        username_results = client.table("profiles").select(
            "id, full_name, username, profile_url, bio, is_private, followers_count, following_count"
        ).ilike("username", f"%{search_query}%").limit(limit).execute()
        
        # Get profiles matching full_name
        name_results = client.table("profiles").select(
            "id, full_name, username, profile_url, bio, is_private, followers_count, following_count"
        ).ilike("full_name", f"%{search_query}%").limit(limit).execute()
        
        # Combine and deduplicate results
        profiles_dict = {}
        for profile in (username_results.data or []):
            profiles_dict[profile["id"]] = profile
        for profile in (name_results.data or []):
            profiles_dict[profile["id"]] = profile
        
        profiles_data = list(profiles_dict.values())[:limit]
        
        if not profiles_data:
            return {
                "success": True,
                "users": [],
                "query": query
            }
        
        # Get connection status for each user (if current user is logged in)
        user_ids = [p["id"] for p in profiles_data]
        following_map = {}
        pending_map = {}
        
        if current_user_id:
            # Get accepted connections
            following = client.table("follows").select("following_id").eq("follower_id", current_user_id).eq("status", "accepted").in_("following_id", user_ids).execute()
            following_map = {f["following_id"]: True for f in following.data}
            
            # Get pending connections
            pending = client.table("follows").select("following_id").eq("follower_id", current_user_id).eq("status", "pending").in_("following_id", user_ids).execute()
            pending_map = {p["following_id"]: True for p in pending.data}
        
        # Format response with connection status
        formatted_users = []
        for profile in profiles_data:
            user_id = profile["id"]
            connection_status = "none"
            if current_user_id:
                if user_id == current_user_id:
                    connection_status = "self"
                elif following_map.get(user_id):
                    connection_status = "following"
                elif pending_map.get(user_id):
                    connection_status = "pending"
            
            formatted_users.append({
                "id": user_id,
                "full_name": profile.get("full_name"),
                "username": profile.get("username"),
                "profile_url": profile.get("profile_url"),
                "bio": profile.get("bio"),
                "is_private": profile.get("is_private", False),
                "followers_count": profile.get("followers_count", 0),
                "following_count": profile.get("following_count", 0),
                "connection_status": connection_status
            })
        
        return {
            "success": True,
            "users": formatted_users,
            "query": query,
            "total": len(formatted_users)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error searching users: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/profile/username/{username}/check")
async def check_username_availability(username: str):
    """Check if username is available"""
    try:
        # Normalize username
        username_lower = username.lower().strip()
        
        # Validate username format
        if not username_lower or len(username_lower) < 3:
            return {
                "available": False,
                "username": username_lower,
                "message": "Username must be at least 3 characters"
            }
        
        # Check if username exists
        try:
            response = supabase.table("profiles").select("id").eq("username", username_lower).execute()
            
            # response.data will be an empty list [] if no rows found
            is_available = response.data is None or len(response.data) == 0
            
            return {
                "available": is_available,
                "username": username_lower
            }
        except Exception as db_error:
            # Check if error is due to missing column
            error_str = str(db_error)
            if "does not exist" in error_str or "column" in error_str.lower():
                # Table or column doesn't exist - assume username is available
                # This handles the case where the table hasn't been set up yet
                print(f"Warning: Database schema issue - {error_str}. Assuming username is available.")
                return {
                    "available": True,
                    "username": username_lower,
                    "message": "Database schema not set up. Please run the SQL migration."
                }
            else:
                # Other database error
                raise
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error checking username availability: {e}")
        raise HTTPException(status_code=500, detail=f"Error checking username: {str(e)}")

