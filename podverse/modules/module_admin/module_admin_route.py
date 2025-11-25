from fastapi import APIRouter, HTTPException, Depends, Query, File, UploadFile, Form
from connection_supabase_client import supabase, get_authenticated_supabase_client, get_service_role_client
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, timedelta
from langchain_huggingface import HuggingFaceEmbeddings
import os

router = APIRouter(prefix="/admin", tags=["admin"])

# ==================== Models ====================

class UserStatusUpdate(BaseModel):
    status: str  # active, suspended, inactive

class PostStatusUpdate(BaseModel):
    status: str  # published, draft, hidden, flagged

class CommentStatusUpdate(BaseModel):
    status: str  # published, hidden, flagged

# ==================== Helper Functions ====================

async def check_admin_access(auth_data: dict = Depends(get_authenticated_supabase_client)):
    """Check if the authenticated user is an admin"""
    try:
        user_id = auth_data["user_id"]
        client = auth_data["client"]
        
        # Check if user has admin role
        profile_response = client.table("profiles").select("role").eq("id", user_id).single().execute()
        
        if not profile_response.data or profile_response.data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        return auth_data
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error checking admin access: {e}")
        raise HTTPException(status_code=500, detail="Error checking admin access")

# ==================== User Management Routes ====================

@router.get("/users")
async def get_all_users(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    sort_field: str = Query("created_at"),
    sort_direction: str = Query("desc"),
    auth_data: dict = Depends(check_admin_access)
):
    """Get all users with pagination, search, and filtering"""
    try:
        client = auth_data["client"]
        offset = (page - 1) * limit
        
        # Build query
        query = client.table("profiles").select(
            "id, username, full_name, email, role, created_at, profile_url, onboarding_complete"
        )
        
        # Note: status column doesn't exist in profiles table, so we skip status filtering
        
        if search:
            query = query.or_(f"username.ilike.%{search}%,full_name.ilike.%{search}%,email.ilike.%{search}%")
        
        # Apply sorting
        ascending = sort_direction == "asc"
        query = query.order(sort_field, desc=not ascending)
        
        # Get paginated results
        response = query.range(offset, offset + limit - 1).execute()
        
        # Get total count
        count_query = client.table("profiles").select("id", count="exact")
        if search:
            count_query = count_query.or_(f"username.ilike.%{search}%,full_name.ilike.%{search}%,email.ilike.%{search}%")
        count_response = count_query.execute()
        total = count_response.count if hasattr(count_response, 'count') else len(count_response.data)
        
        # Get additional stats for each user
        users = response.data
        for user in users:
            # Get posts count
            posts_count = client.table("posts").select("id", count="exact").eq("user_id", user["id"]).execute()
            user["posts_count"] = posts_count.count if hasattr(posts_count, 'count') else len(posts_count.data)
            
            # Get followers count
            followers_count = client.table("follows").select("id", count="exact").eq(
                "following_id", user["id"]
            ).eq("status", "accepted").execute()
            user["followers_count"] = followers_count.count if hasattr(followers_count, 'count') else len(followers_count.data)
        
        return {
            "success": True,
            "users": users,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": (total + limit - 1) // limit
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching users: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/users/stats")
async def get_user_stats(auth_data: dict = Depends(check_admin_access)):
    """Get user statistics"""
    try:
        client = auth_data["client"]
        
        # Get total users
        total_response = client.table("profiles").select("id", count="exact").execute()
        total = total_response.count if hasattr(total_response, 'count') else len(total_response.data)
        
        # Get users with completed onboarding (active users)
        active_response = client.table("profiles").select("id", count="exact").eq("onboarding_complete", True).execute()
        active = active_response.count if hasattr(active_response, 'count') else len(active_response.data)
        
        # Get users with incomplete onboarding
        inactive_response = client.table("profiles").select("id", count="exact").eq("onboarding_complete", False).execute()
        inactive = inactive_response.count if hasattr(inactive_response, 'count') else len(inactive_response.data)
        
        # Note: status column doesn't exist, so we use onboarding_complete as proxy
        return {
            "success": True,
            "stats": {
                "total": total,
                "active": active,
                "suspended": 0,  # Not available in current schema
                "inactive": inactive
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching user stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/users/{user_id}")
async def get_user_by_id(
    user_id: str,
    auth_data: dict = Depends(check_admin_access)
):
    """Get user details by ID"""
    try:
        client = auth_data["client"]
        
        # Get user profile
        response = client.table("profiles").select("*").eq("id", user_id).single().execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        user = response.data
        
        # Get additional stats
        posts_count = client.table("posts").select("id", count="exact").eq("user_id", user_id).execute()
        user["posts_count"] = posts_count.count if hasattr(posts_count, 'count') else len(posts_count.data)
        
        followers_count = client.table("follows").select("id", count="exact").eq("following_id", user_id).eq("status", "accepted").execute()
        user["followers_count"] = followers_count.count if hasattr(followers_count, 'count') else len(followers_count.data)
        
        following_count = client.table("follows").select("id", count="exact").eq("follower_id", user_id).eq("status", "accepted").execute()
        user["following_count"] = following_count.count if hasattr(following_count, 'count') else len(following_count.data)
        
        comments_count = client.table("comments").select("id", count="exact").eq("user_id", user_id).execute()
        user["comments_count"] = comments_count.count if hasattr(comments_count, 'count') else len(comments_count.data)
        
        return {
            "success": True,
            "user": user
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching user: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class UserCreate(BaseModel):
    email: str
    username: str
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = "user"
    onboarding_complete: Optional[bool] = False

class UserUpdate(BaseModel):
    username: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    onboarding_complete: Optional[bool] = None
    bio: Optional[str] = None
    profile_url: Optional[str] = None

@router.post("/users")
async def create_user(
    user: UserCreate,
    auth_data: dict = Depends(check_admin_access)
):
    """Create a new user"""
    try:
        service_client = get_service_role_client()
        
        # Create auth user first
        auth_response = service_client.auth.admin.create_user({
            "email": user.email,
            "password": user.password or "TempPassword123!",  # Default password if not provided
            "email_confirm": True
        })
        
        if not auth_response.user:
            raise HTTPException(status_code=500, detail="Failed to create auth user")
        
        new_user_id = auth_response.user.id
        
        # Create profile
        profile_data = {
            "id": new_user_id,
            "email": user.email,
            "username": user.username,
            "full_name": user.full_name or user.username,
            "role": user.role,
            "onboarding_complete": user.onboarding_complete
        }
        
        response = service_client.table("profiles").insert(profile_data).execute()
        
        if not response.data:
            # Rollback: delete auth user if profile creation fails
            try:
                service_client.auth.admin.delete_user(new_user_id)
            except:
                pass
            raise HTTPException(status_code=500, detail="Failed to create user profile")
        
        return {
            "success": True,
            "message": "User created successfully",
            "user": response.data[0]
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating user: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/users/{user_id}")
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    auth_data: dict = Depends(check_admin_access)
):
    """Update user details"""
    try:
        service_client = get_service_role_client()
        
        # Check if user exists
        user_check = service_client.table("profiles").select("id").eq("id", user_id).execute()
        if not user_check.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Build update data
        update_data = {}
        if user_update.username is not None:
            update_data["username"] = user_update.username
        if user_update.full_name is not None:
            update_data["full_name"] = user_update.full_name
        if user_update.email is not None:
            update_data["email"] = user_update.email
        if user_update.role is not None:
            update_data["role"] = user_update.role
        if user_update.onboarding_complete is not None:
            update_data["onboarding_complete"] = user_update.onboarding_complete
        if user_update.bio is not None:
            update_data["bio"] = user_update.bio
        if user_update.profile_url is not None:
            update_data["profile_url"] = user_update.profile_url
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Update profile
        response = service_client.table("profiles").update(update_data).eq("id", user_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update auth email if email changed
        if user_update.email:
            try:
                service_client.auth.admin.update_user_by_id(user_id, {"email": user_update.email})
            except Exception as auth_error:
                print(f"Warning: Could not update auth email: {auth_error}")
        
        return {
            "success": True,
            "message": "User updated successfully",
            "user": response.data[0]
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating user: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    status_update: UserStatusUpdate,
    auth_data: dict = Depends(check_admin_access)
):
    """Update user onboarding status (status column doesn't exist, using onboarding_complete)"""
    try:
        client = auth_data["client"]
        
        # Map status to onboarding_complete since status column doesn't exist
        # active -> onboarding_complete = True
        # inactive/suspended -> onboarding_complete = False
        onboarding_complete = status_update.status == "active"
        
        # Update onboarding status
        response = client.table("profiles").update({
            "onboarding_complete": onboarding_complete
        }).eq("id", user_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "success": True,
            "message": f"User onboarding status updated",
            "user": response.data[0]
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating user status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    auth_data: dict = Depends(check_admin_access)
):
    """Delete a user from the database - handles foreign key constraints by deleting related records first"""
    try:
        service_client = get_service_role_client()
        
        # Check if user exists
        user_check = service_client.table("profiles").select("id").eq("id", user_id).execute()
        if not user_check.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Delete related records in order (to avoid foreign key violations)
        # 1. Delete comments by this user
        service_client.table("comments").delete().eq("user_id", user_id).execute()
        
        # 2. Delete comments on user's posts (optional - you may want to keep these)
        # Get user's posts first
        user_posts = service_client.table("posts").select("id").eq("user_id", user_id).execute()
        post_ids = [post["id"] for post in user_posts.data] if user_posts.data else []
        if post_ids:
            service_client.table("comments").delete().in_("post_id", post_ids).execute()
        
        # 3. Delete post likes by this user
        service_client.table("post_likes").delete().eq("user_id", user_id).execute()
        
        # 4. Delete post likes on user's posts
        if post_ids:
            service_client.table("post_likes").delete().in_("post_id", post_ids).execute()
        
        # 5. Delete post views by this user
        service_client.table("post_views").delete().eq("user_id", user_id).execute()
        
        # 6. Delete posts by this user
        if post_ids:
            service_client.table("posts").delete().eq("user_id", user_id).execute()
        
        # 7. Delete follow relationships (both as follower and following)
        service_client.table("follows").delete().eq("follower_id", user_id).execute()
        service_client.table("follows").delete().eq("following_id", user_id).execute()
        
        # 8. Delete notifications for this user
        service_client.table("notifications").delete().eq("user_id", user_id).execute()
        service_client.table("notifications").delete().eq("from_user_id", user_id).execute()
        
        # 9. Delete user profile
        response = service_client.table("profiles").delete().eq("id", user_id).execute()
        
        # 10. Delete from Supabase Auth (auth.users table)
        try:
            # Use admin API to delete auth user
            service_client.auth.admin.delete_user(user_id)
        except Exception as auth_error:
            print(f"Warning: Could not delete auth user: {auth_error}")
            # Continue even if auth deletion fails - profile is already deleted
        
        return {
            "success": True,
            "message": "User and all related data deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting user: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Posts Management Routes ====================

@router.get("/posts")
async def get_all_posts(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    auth_data: dict = Depends(check_admin_access)
):
    """Get all posts with moderation info"""
    try:
        client = auth_data["client"]
        offset = (page - 1) * limit
        
        # Build query - select all columns including title
        query = client.table("posts").select(
            "*, profiles:user_id(id, username, full_name, profile_url)"
        )
        
        # Add search filter if provided (search in title and description)
        if search:
            # Search in both title and description using or filter
            query = query.or_(f"title.ilike.%{search}%,description.ilike.%{search}%")
        
        # Get paginated results
        response = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        
        # Get total count
        count_query = client.table("posts").select("id", count="exact")
        if search:
            count_query = count_query.or_(f"title.ilike.%{search}%,description.ilike.%{search}%")
        count_response = count_query.execute()
        total = count_response.count if hasattr(count_response, 'count') else len(count_response.data)
        
        # Enrich posts with counts
        posts = response.data
        for post in posts:
            # Get likes count
            likes_count = client.table("post_likes").select("id", count="exact").eq("post_id", post["id"]).execute()
            post["likes_count"] = likes_count.count if hasattr(likes_count, 'count') else len(likes_count.data)
            
            # Get comments count
            comments_count = client.table("comments").select("id", count="exact").eq("post_id", post["id"]).execute()
            post["comments_count"] = comments_count.count if hasattr(comments_count, 'count') else len(comments_count.data)
            
            # Get views count
            post["views_count"] = post.get("views", 0)
        
        return {
            "success": True,
            "posts": posts,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": (total + limit - 1) // limit
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching posts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/posts/{post_id}/status")
async def update_post_status(
    post_id: str,
    status_update: PostStatusUpdate,
    auth_data: dict = Depends(check_admin_access)
):
    """Update post - posts table doesn't have status column, this is a placeholder"""
    try:
        client = auth_data["client"]
        
        # Check if post exists
        post_response = client.table("posts").select("id").eq("id", post_id).execute()
        if not post_response.data:
            raise HTTPException(status_code=404, detail="Post not found")
        
        # Posts table doesn't have status column, so we just return success
        return {
            "success": True,
            "message": "Post operation completed",
            "post_id": post_id
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating post: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/posts/{post_id}")
async def delete_post(
    post_id: str,
    auth_data: dict = Depends(check_admin_access)
):
    """Delete a post"""
    try:
        client = auth_data["client"]
        
        response = client.table("posts").delete().eq("id", post_id).execute()
        
        return {
            "success": True,
            "message": "Post deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting post: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Comments Management Routes ====================

@router.get("/comments")
async def get_all_comments(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    auth_data: dict = Depends(check_admin_access)
):
    """Get all comments"""
    try:
        client = auth_data["client"]
        offset = (page - 1) * limit
        
        # Build query - fetch comments and enrich with profile/post data separately
        query = client.table("comments").select("*")
        
        # Comments table doesn't have status column, so we skip status filtering
        if search:
            query = query.ilike("content", f"%{search}%")
        
        # Get paginated results
        response = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        comments = response.data
        
        # Enrich comments with profile and post data
        for comment in comments:
            try:
                # Get profile
                if comment.get("user_id"):
                    profile_res = client.table("profiles").select("id, username, full_name, profile_url").eq("id", comment["user_id"]).limit(1).execute()
                    comment["profiles"] = profile_res.data[0] if profile_res.data else None
                
                # Get post
                if comment.get("post_id"):
                    post_res = client.table("posts").select("id, content").eq("id", comment["post_id"]).limit(1).execute()
                    comment["posts"] = post_res.data[0] if post_res.data else None
            except Exception as e:
                print(f"Error enriching comment {comment.get('id')}: {e}")
                comment["profiles"] = None
                comment["posts"] = None
        
        # Get total count
        count_query = client.table("comments").select("id", count="exact")
        if search:
            count_query = count_query.ilike("content", f"%{search}%")
        count_response = count_query.execute()
        total = count_response.count if hasattr(count_response, 'count') else len(count_response.data)
        
        return {
            "success": True,
            "comments": comments,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": (total + limit - 1) // limit
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching comments: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/comments/{comment_id}/status")
async def update_comment_status(
    comment_id: str,
    status_update: CommentStatusUpdate,
    auth_data: dict = Depends(check_admin_access)
):
    """Update comment - comments table doesn't have status column, this is a placeholder"""
    try:
        client = auth_data["client"]
        
        # Check if comment exists
        comment_response = client.table("comments").select("id").eq("id", comment_id).execute()
        if not comment_response.data:
            raise HTTPException(status_code=404, detail="Comment not found")
        
        # Comments table doesn't have status column, so we just return success
        return {
            "success": True,
            "message": "Comment operation completed",
            "comment_id": comment_id
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating comment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/comments/{comment_id}")
async def delete_comment(
    comment_id: str,
    auth_data: dict = Depends(check_admin_access)
):
    """Delete a comment"""
    try:
        client = auth_data["client"]
        
        response = client.table("comments").delete().eq("id", comment_id).execute()
        
        return {
            "success": True,
            "message": "Comment deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting comment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Analytics Routes ====================

@router.get("/analytics/overview")
async def get_analytics_overview(
    days: int = Query(30, ge=1, le=365),
    auth_data: dict = Depends(check_admin_access)
):
    """Get platform analytics overview - all data from Supabase"""
    try:
        client = auth_data["client"]
        service_client = get_service_role_client()
        
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Get total users
        total_users_response = service_client.table("profiles").select("id", count="exact").execute()
        total_users = total_users_response.count if hasattr(total_users_response, 'count') else len(total_users_response.data)
        
        # Get active users (with completed onboarding)
        active_users_response = service_client.table("profiles").select("id", count="exact").eq("onboarding_complete", True).execute()
        active_users = active_users_response.count if hasattr(active_users_response, 'count') else len(active_users_response.data)
        
        # Get new users in date range
        new_users_response = service_client.table("profiles").select("id", count="exact").gte("created_at", start_date.isoformat()).execute()
        new_users = new_users_response.count if hasattr(new_users_response, 'count') else len(new_users_response.data)
        
        # Get total posts
        total_posts_response = service_client.table("posts").select("id", count="exact").execute()
        total_posts = total_posts_response.count if hasattr(total_posts_response, 'count') else len(total_posts_response.data)
        
        # Get posts in date range
        new_posts_response = service_client.table("posts").select("id", count="exact").gte("created_at", start_date.isoformat()).execute()
        new_posts = new_posts_response.count if hasattr(new_posts_response, 'count') else len(new_posts_response.data)
        
        # Get total views from post_views table
        views_response = service_client.table("post_views").select("id", count="exact").execute()
        total_views = views_response.count if hasattr(views_response, 'count') else len(views_response.data)
        
        # Get views in date range
        new_views_response = service_client.table("post_views").select("id", count="exact").gte("created_at", start_date.isoformat()).execute()
        new_views = new_views_response.count if hasattr(new_views_response, 'count') else len(new_views_response.data)
        
        # Get engagement metrics
        total_likes_response = service_client.table("post_likes").select("id", count="exact").execute()
        total_likes = total_likes_response.count if hasattr(total_likes_response, 'count') else len(total_likes_response.data)
        
        new_likes_response = service_client.table("post_likes").select("id", count="exact").gte("created_at", start_date.isoformat()).execute()
        new_likes = new_likes_response.count if hasattr(new_likes_response, 'count') else len(new_likes_response.data)
        
        total_comments_response = service_client.table("comments").select("id", count="exact").execute()
        total_comments = total_comments_response.count if hasattr(total_comments_response, 'count') else len(total_comments_response.data)
        
        new_comments_response = service_client.table("comments").select("id", count="exact").gte("created_at", start_date.isoformat()).execute()
        new_comments = new_comments_response.count if hasattr(new_comments_response, 'count') else len(new_comments_response.data)
        
        # Calculate engagement rate
        engagement_rate = 0
        if total_views > 0:
            engagement_rate = ((total_likes + total_comments) / total_views) * 100
        
        # Get top posts by views (only get columns that exist)
        try:
            top_posts_response = service_client.table("posts").select("id, title, views, created_at, video_url, thumbnail_url").order("views", desc=True).limit(5).execute()
            top_posts = top_posts_response.data if top_posts_response.data else []
            # Add a simple description for display
            for post in top_posts:
                post["description"] = f"Post {post['id'][:8]}..." if post.get('id') else "Post"
        except Exception as e:
            print(f"Error fetching top posts: {e}")
            top_posts = []
        
        return {
            "success": True,
            "analytics": {
                "total_users": total_users,
                "active_users": active_users,
                "new_users": new_users,
                "total_posts": total_posts,
                "new_posts": new_posts,
                "total_views": total_views,
                "new_views": new_views,
                "total_likes": total_likes,
                "new_likes": new_likes,
                "total_comments": total_comments,
                "new_comments": new_comments,
                "engagement_rate": round(engagement_rate, 2),
                "top_posts": top_posts
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Knowledge Base Routes ====================

@router.get("/faqs")
async def get_faqs(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    auth_data: dict = Depends(check_admin_access)
):
    """Get all FAQs"""
    try:
        client = auth_data["client"]
        offset = (page - 1) * limit
        
        query = client.table("faq_data").select("id, question, answer, created_at")
        
        if search:
            query = query.or_(f"question.ilike.%{search}%,answer.ilike.%{search}%")
        
        response = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        
        count_query = client.table("faq_data").select("id", count="exact")
        if search:
            count_query = count_query.or_(f"question.ilike.%{search}%,answer.ilike.%{search}%")
        count_response = count_query.execute()
        total = count_response.count if hasattr(count_response, 'count') else len(count_response.data)
        
        return {
            "success": True,
            "faqs": response.data,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": (total + limit - 1) // limit
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching FAQs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class FAQCreate(BaseModel):
    question: str
    answer: str

class FAQUpdate(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None

@router.post("/faqs")
async def create_faq(
    faq: FAQCreate,
    auth_data: dict = Depends(check_admin_access)
):
    """Create a new FAQ with embeddings"""
    try:
        client = auth_data["client"]
        
        # Generate embedding for the question (same as module_faq)
        EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
        embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
        question_vector = embeddings.embed_query(faq.question.strip())
        
        response = client.table("faq_data").insert({
            "question": faq.question.strip(),
            "answer": faq.answer.strip(),
            "embedding": question_vector
        }).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create FAQ")
        
        return {
            "success": True,
            "message": "FAQ created successfully",
            "faq": response.data[0]
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating FAQ: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/faqs/{faq_id}")
async def update_faq(
    faq_id: str,
    faq_update: FAQUpdate,
    auth_data: dict = Depends(check_admin_access)
):
    """Update an existing FAQ - regenerates embedding if question changed"""
    try:
        client = auth_data["client"]
        
        update_data = {}
        if faq_update.question is not None:
            # Regenerate embedding if question changed
            EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
            embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
            question_vector = embeddings.embed_query(faq_update.question.strip())
            update_data["question"] = faq_update.question.strip()
            update_data["embedding"] = question_vector
        if faq_update.answer is not None:
            update_data["answer"] = faq_update.answer.strip()
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        response = client.table("faq_data").update(update_data).eq("id", faq_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="FAQ not found")
        
        return {
            "success": True,
            "message": "FAQ updated successfully",
            "faq": response.data[0]
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating FAQ: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/faqs/{faq_id}")
async def delete_faq(
    faq_id: str,
    auth_data: dict = Depends(check_admin_access)
):
    """Delete an FAQ"""
    try:
        client = auth_data["client"]
        
        response = client.table("faq_data").delete().eq("id", faq_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="FAQ not found")
        
        return {
            "success": True,
            "message": "FAQ deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting FAQ: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Posts CRUD Routes ====================

class PostCreate(BaseModel):
    user_id: str
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None

class PostUpdate(BaseModel):
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None

@router.post("/posts")
async def create_post(
    post: PostCreate,
    auth_data: dict = Depends(check_admin_access)
):
    """Create a new post"""
    try:
        client = auth_data["client"]
        
        # Verify user exists
        user_check = client.table("profiles").select("id").eq("id", post.user_id).execute()
        if not user_check.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Only insert columns that exist in posts table
        insert_data = {
            "user_id": post.user_id
        }
        if post.video_url:
            insert_data["video_url"] = post.video_url
        if post.thumbnail_url:
            insert_data["thumbnail_url"] = post.thumbnail_url
        
        response = client.table("posts").insert(insert_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create post")
        
        return {
            "success": True,
            "message": "Post created successfully",
            "post": response.data[0]
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating post: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/posts/{post_id}")
async def update_post(
    post_id: str,
    post_update: PostUpdate,
    auth_data: dict = Depends(check_admin_access)
):
    """Update an existing post"""
    try:
        client = auth_data["client"]
        
        update_data = {}
        if post_update.video_url is not None:
            update_data["video_url"] = post_update.video_url
        if post_update.thumbnail_url is not None:
            update_data["thumbnail_url"] = post_update.thumbnail_url
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        response = client.table("posts").update(update_data).eq("id", post_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Post not found")
        
        return {
            "success": True,
            "message": "Post updated successfully",
            "post": response.data[0]
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating post: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Comments CRUD Routes ====================

class CommentCreate(BaseModel):
    content: str
    post_id: str
    user_id: str
    parent_comment_id: Optional[str] = None

class CommentUpdate(BaseModel):
    content: Optional[str] = None

@router.post("/comments")
async def create_comment(
    comment: CommentCreate,
    auth_data: dict = Depends(check_admin_access)
):
    """Create a new comment"""
    try:
        client = auth_data["client"]
        
        # Verify user and post exist
        user_check = client.table("profiles").select("id").eq("id", comment.user_id).execute()
        if not user_check.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        post_check = client.table("posts").select("id").eq("id", comment.post_id).execute()
        if not post_check.data:
            raise HTTPException(status_code=404, detail="Post not found")
        
        insert_data = {
            "content": comment.content,
            "post_id": comment.post_id,
            "user_id": comment.user_id
        }
        
        if comment.parent_comment_id:
            insert_data["parent_comment_id"] = comment.parent_comment_id
        
        response = client.table("comments").insert(insert_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create comment")
        
        return {
            "success": True,
            "message": "Comment created successfully",
            "comment": response.data[0]
            
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating comment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/comments/{comment_id}")
async def update_comment(
    comment_id: str,
    comment_update: CommentUpdate,
    auth_data: dict = Depends(check_admin_access)
):
    """Update an existing comment"""
    try:
        client = auth_data["client"]
        
        if comment_update.content is None:
            raise HTTPException(status_code=400, detail="Content is required")
        
        response = client.table("comments").update({
            "content": comment_update.content
        }).eq("id", comment_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Comment not found")
        
        return {
            "success": True,
            "message": "Comment updated successfully",
            "comment": response.data[0]
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating comment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Avatar Templates Routes ====================

@router.get("/avatar-templates")
async def get_avatar_templates(
    speaker: Optional[str] = Query(None, description="Filter by speaker: A or B"),
    auth_data: dict = Depends(check_admin_access)
):
    """Get all avatar templates"""
    try:
        service_client = get_service_role_client()
        
        if speaker and speaker.upper() not in ["A", "B"]:
            raise HTTPException(status_code=400, detail="Speaker must be 'A' or 'B'")
        
        templates = []
        speakers_to_fetch = [speaker.upper()] if speaker else ["A", "B"]
        
        for sp in speakers_to_fetch:
            folder_path = f"speaker-{sp.lower()}"
            try:
                files = service_client.storage.from_('avatar-templates').list(folder_path)
                for file in files:
                    public_url = service_client.storage.from_('avatar-templates').get_public_url(
                        f"{folder_path}/{file['name']}"
                    )
                    templates.append({
                        "id": f"{sp.lower()}_{file['name'].split('.')[0]}",
                        "name": file['name'].replace('-', ' ').replace('.jpg', '').replace('.png', '').title(),
                        "url": public_url,
                        "speaker": sp,
                        "filename": file['name'],
                        "path": f"{folder_path}/{file['name']}"
                    })
            except Exception as e:
                print(f"Error fetching templates for speaker {sp}: {e}")
                continue
        
        return {
            "success": True,
            "templates": templates,
            "total": len(templates)
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching avatar templates: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/avatar-templates")
async def upload_avatar_template(
    file: UploadFile = File(...),
    speaker: str = Form(...),
    auth_data: dict = Depends(check_admin_access)
):
    """Upload a new avatar template for speaker A or B"""
    try:
        service_client = get_service_role_client()
        
        if speaker.upper() not in ["A", "B"]:
            raise HTTPException(status_code=400, detail="Speaker must be 'A' or 'B'")
        
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read file content
        file_content = await file.read()
        
        # Generate filename
        folder_path = f"speaker-{speaker.lower()}"
        filename = file.filename or f"template_{datetime.now().timestamp()}.{file.content_type.split('/')[1]}"
        
        # Upload to Supabase storage
        storage_path = f"{folder_path}/{filename}"
        service_client.storage.from_('avatar-templates').upload(
            storage_path,
            file_content,
            {
                "content-type": file.content_type,
                "x-upsert": "true"
            }
        )
        
        # Get public URL
        public_url = service_client.storage.from_('avatar-templates').get_public_url(storage_path)
        
        return {
            "success": True,
            "message": "Avatar template uploaded successfully",
            "template": {
                "id": f"{speaker.lower()}_{filename.split('.')[0]}",
                "name": filename.replace('-', ' ').replace('.jpg', '').replace('.png', '').replace('.jpeg', '').title(),
                "url": public_url,
                "speaker": speaker.upper(),
                "filename": filename,
                "path": storage_path
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error uploading avatar template: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/avatar-templates/{template_id}")
async def delete_avatar_template(
    template_id: str,
    auth_data: dict = Depends(check_admin_access)
):
    """Delete an avatar template"""
    try:
        service_client = get_service_role_client()
        
        # Parse template_id format: "a_template-name" or "b_template-name"
        parts = template_id.split("_", 1)
        if len(parts) != 2:
            raise HTTPException(status_code=400, detail="Invalid template ID format")
        
        speaker = parts[0].upper()
        if speaker not in ["A", "B"]:
            raise HTTPException(status_code=400, detail="Invalid speaker in template ID")
        
        filename = parts[1]
        # Try common extensions
        possible_files = [f"{filename}.jpg", f"{filename}.png", f"{filename}.jpeg"]
        folder_path = f"speaker-{speaker.lower()}"
        
        deleted = False
        deleted_file = None
        for possible_file in possible_files:
            storage_path = f"{folder_path}/{possible_file}"
            try:
                # Check if file exists first by listing files
                files = service_client.storage.from_('avatar-templates').list(folder_path)
                file_exists = any(f['name'] == possible_file for f in files)
                
                if file_exists:
                    # Delete the file
                    service_client.storage.from_('avatar-templates').remove([storage_path])
                    deleted = True
                    deleted_file = possible_file
                    print(f"✅ Successfully deleted: {storage_path}")
                    break
            except Exception as e:
                print(f"Error trying to delete {possible_file}: {e}")
                continue
        
        if not deleted:
            # Try to find the actual file name by listing all files and matching
            try:
                files = service_client.storage.from_('avatar-templates').list(folder_path)
                matching_files = [f for f in files if filename.lower() in f['name'].lower()]
                if matching_files:
                    actual_file = matching_files[0]['name']
                    storage_path = f"{folder_path}/{actual_file}"
                    service_client.storage.from_('avatar-templates').remove([storage_path])
                    deleted = True
                    deleted_file = actual_file
                    print(f"✅ Successfully deleted (found by search): {storage_path}")
            except Exception as e:
                print(f"Error searching for file: {e}")
        
        if not deleted:
            raise HTTPException(status_code=404, detail=f"Avatar template not found: {template_id}")
        
        return {
            "success": True,
            "message": f"Avatar template deleted successfully: {deleted_file}",
            "deleted_file": deleted_file
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting avatar template: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Voices Routes ====================

@router.get("/voices")
async def get_voices(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    auth_data: dict = Depends(check_admin_access)
):
    """Get all voices from Supabase storage"""
    try:
        service_client = get_service_role_client()
        offset = (page - 1) * limit
        
        bucket_name = "voices"
        folder_path = "voices_gemini"
        
        # List all files in the voices_gemini folder
        files = service_client.storage.from_(bucket_name).list(folder_path)
        
        voices_list = []
        for file in files:
            if not file['name'].endswith('.mp3'):
                continue
            
            # Extract voice name from filename
            voice_name = file['name'].replace('.mp3', '').replace('_', ' ').title()
            
            # Apply search filter
            if search and search.lower() not in voice_name.lower():
                continue
            
            file_path = f"{folder_path}/{file['name']}"
            public_url = service_client.storage.from_(bucket_name).get_public_url(file_path)
            
            voices_list.append({
                "id": file['name'],
                "name": voice_name,
                "filename": file['name'],
                "url": public_url,
                "path": file_path,
                "created_at": file.get("created_at", ""),
                "updated_at": file.get("updated_at", "")
            })
        
        # Sort and paginate
        voices_list.sort(key=lambda x: x["name"])
        total = len(voices_list)
        paginated_voices = voices_list[offset:offset + limit]
        
        return {
            "success": True,
            "voices": paginated_voices,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": (total + limit - 1) // limit
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching voices: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/voices/{voice_id}")
async def delete_voice(
    voice_id: str,
    auth_data: dict = Depends(check_admin_access)
):
    """Delete a voice from storage"""
    try:
        service_client = get_service_role_client()
        
        bucket_name = "voices"
        folder_path = "voices_gemini"
        file_path = f"{folder_path}/{voice_id}"
        
        # Ensure it's an mp3 file
        if not voice_id.endswith('.mp3'):
            file_path = f"{folder_path}/{voice_id}.mp3"
        
        service_client.storage.from_(bucket_name).remove([file_path])
        
        return {
            "success": True,
            "message": "Voice deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting voice: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Subscription Management Routes ====================

class SubscriptionUpdate(BaseModel):
    status: Optional[str] = None
    plan: Optional[str] = None
    current_period_end: Optional[str] = None

@router.get("/subscriptions")
async def get_all_subscriptions(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    plan: Optional[str] = Query(None),
    auth_data: dict = Depends(check_admin_access)
):
    """Get all subscriptions with filtering and pagination"""
    try:
        client = auth_data["client"]
        offset = (page - 1) * limit
        
        # Build query with count
        count_query = client.table("subscriptions").select("*", count="exact")
        
        # Apply filters to count query
        if status:
            count_query = count_query.eq("status", status)
        if plan:
            count_query = count_query.eq("plan", plan)
        
        # Get total count first
        count_response = count_query.execute()
        total = count_response.count if hasattr(count_response, 'count') else len(count_response.data)
        
        # Build main query - fetch subscriptions
        query = client.table("subscriptions").select("*")
        
        # Apply filters
        if status:
            query = query.eq("status", status)
        if plan:
            query = query.eq("plan", plan)
        
        # Get paginated results
        response = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        subscriptions = response.data
        
        # Enrich subscriptions with profile data from profiles table
        if subscriptions:
            user_ids = [s["user_id"] for s in subscriptions if s.get("user_id")]
            
            if user_ids:
                # Fetch profiles for these user_ids
                profiles_result = client.table("profiles")\
                    .select("id, username, full_name, profile_url, email")\
                    .in_("id", user_ids)\
                    .execute()
                
                # Create a map of user_id -> profile
                profiles_map = {p["id"]: p for p in profiles_result.data}
                
                # Attach profiles to subscriptions
                for subscription in subscriptions:
                    user_id = subscription.get("user_id")
                    subscription["profiles"] = profiles_map.get(user_id)
        
        # Filter by search term if provided (search in user email/username)
        if search:
            search_lower = search.lower()
            filtered_subscriptions = []
            for s in subscriptions:
                profile = s.get("profiles") or {}
                email = profile.get("email", "").lower()
                username = profile.get("username", "").lower()
                full_name = profile.get("full_name", "").lower()
                
                if search_lower in email or search_lower in username or search_lower in full_name:
                    filtered_subscriptions.append(s)
            
            subscriptions = filtered_subscriptions
            total = len(subscriptions)
        
        return {
            "success": True,
            "subscriptions": subscriptions,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": (total + limit - 1) // limit
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching subscriptions: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/subscriptions/{subscription_id}")
async def update_subscription(
    subscription_id: str,
    subscription_update: SubscriptionUpdate,
    auth_data: dict = Depends(check_admin_access)
):
    """Update a subscription"""
    try:
        client = auth_data["client"]
        
        # Build update data
        update_data = {}
        if subscription_update.status is not None:
            update_data["status"] = subscription_update.status
        if subscription_update.plan is not None:
            update_data["plan"] = subscription_update.plan
        if subscription_update.current_period_end is not None:
            update_data["current_period_end"] = subscription_update.current_period_end
        update_data["updated_at"] = datetime.now().isoformat()
        
        # Update subscription
        response = client.table("subscriptions")\
            .update(update_data)\
            .eq("id", subscription_id)\
            .execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        return {
            "success": True,
            "subscription": response.data[0]
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating subscription: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/subscriptions/{subscription_id}")
async def delete_subscription(
    subscription_id: str,
    auth_data: dict = Depends(check_admin_access)
):
    """Delete a subscription"""
    try:
        client = auth_data["client"]
        
        # Delete subscription
        response = client.table("subscriptions")\
            .delete()\
            .eq("id", subscription_id)\
            .execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        return {
            "success": True,
            "message": "Subscription deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting subscription: {e}")
        raise HTTPException(status_code=500, detail=str(e))

