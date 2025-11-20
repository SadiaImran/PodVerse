from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
from connection_supabase_client import supabase, get_authenticated_supabase_client

router = APIRouter()

# ==================== Connection Models ====================

class ConnectionRequest(BaseModel):
    target_user_id: str
    connection_type: str = "follow"  # "follow" or "friend"

class ConnectionResponse(BaseModel):
    connection_id: str
    status: str
    message: str

# ==================== Connection Endpoints ====================

@router.post("/connections/request")
async def send_connection_request(
    request: ConnectionRequest,
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """
    Send a follow or friend request to another user.
    - Public accounts: Direct follow (status = 'accepted')
    - Private accounts: Request sent (status = 'pending')
    """
    try:
        user_id = auth_data["user_id"]
        client = auth_data["client"]
        target_user_id = request.target_user_id
        connection_type = request.connection_type.lower()

        # Validate connection type
        if connection_type not in ["follow", "friend"]:
            raise HTTPException(status_code=400, detail="connection_type must be 'follow' or 'friend'")

        # Can't follow yourself
        if user_id == target_user_id:
            raise HTTPException(status_code=400, detail="You cannot follow yourself")

        # Check if target user exists
        target_profile = client.table("profiles").select("id, is_private").eq("id", target_user_id).execute()
        if not target_profile.data:
            raise HTTPException(status_code=404, detail="Target user not found")

        target_is_private = target_profile.data[0].get("is_private", False)

        # Check if connection already exists
        existing = client.table("follows").select("*").eq("follower_id", user_id).eq("following_id", target_user_id).execute()
        
        if existing.data:
            existing_connection = existing.data[0]
            current_status = existing_connection.get("status", "accepted")
            
            if current_status == "accepted":
                return {
                    "success": True,
                    "message": "Already following this user",
                    "connection_id": existing_connection["id"],
                    "status": "accepted"
                }
            elif current_status == "pending":
                return {
                    "success": True,
                    "message": "Request already sent",
                    "connection_id": existing_connection["id"],
                    "status": "pending"
                }
            elif current_status == "blocked":
                raise HTTPException(status_code=403, detail="You cannot follow this user")

        # Determine status based on account privacy
        if target_is_private:
            status = "pending"
            message = "Follow request sent. Waiting for approval."
        else:
            status = "accepted"
            message = "Successfully followed user"

        # Create connection record
        connection_data = {
            "follower_id": user_id,
            "following_id": target_user_id,
            "status": status,
            "connection_type": connection_type,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }

        result = client.table("follows").insert(connection_data).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create connection")

        connection_id = result.data[0]["id"]

        # Update follower/following counts
        if status == "accepted":
            # Increment following count for current user
            follower_profile = client.table("profiles").select("following_count").eq("id", user_id).execute()
            current_following = follower_profile.data[0].get("following_count", 0) if follower_profile.data else 0
            client.table("profiles").update({"following_count": current_following + 1}).eq("id", user_id).execute()
            
            # Increment followers count for target user
            following_profile = client.table("profiles").select("followers_count").eq("id", target_user_id).execute()
            current_followers = following_profile.data[0].get("followers_count", 0) if following_profile.data else 0
            client.table("profiles").update({"followers_count": current_followers + 1}).eq("id", target_user_id).execute()

        # Create notification for target user
        try:
            # Get sender profile for message
            sender_profile = client.table("profiles").select("full_name, username").eq("id", user_id).execute()
            sender_name = sender_profile.data[0].get("full_name", "Someone") if sender_profile.data else "Someone"
            sender_username = sender_profile.data[0].get("username", "") if sender_profile.data else ""
            
            notification_type = "follow_request" if status == "pending" else "new_follower"
            notification_message = (
                f"{sender_name} (@{sender_username}) sent you a follow request" 
                if status == "pending" 
                else f"{sender_name} (@{sender_username}) started following you"
            )
            
            notification_data = {
                "user_id": target_user_id,
                "type": notification_type,
                "from_user_id": user_id,
                "message": notification_message,
                "is_read": False,
                "created_at": datetime.utcnow().isoformat()
            }
            client.table("notifications").insert(notification_data).execute()
        except Exception as e:
            print(f"[send_connection_request] Failed to create notification: {e}")
            # Don't fail the request if notification fails

        return {
            "success": True,
            "message": message,
            "connection_id": connection_id,
            "status": status
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error sending connection request: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/connections/{connection_id}/respond")
async def respond_to_connection_request(
    connection_id: str,
    action: str = Query(..., description="'accept' or 'reject'"),
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """
    Accept or reject a pending connection request.
    Only the target user (following_id) can respond.
    """
    try:
        user_id = auth_data["user_id"]
        client = auth_data["client"]

        if action not in ["accept", "reject"]:
            raise HTTPException(status_code=400, detail="action must be 'accept' or 'reject'")

        # Get the connection request
        connection = client.table("follows").select("*").eq("id", connection_id).execute()
        
        if not connection.data:
            raise HTTPException(status_code=404, detail="Connection request not found")

        conn = connection.data[0]

        # Verify user is the target (following_id)
        if conn["following_id"] != user_id:
            raise HTTPException(status_code=403, detail="You can only respond to requests sent to you")

        # Verify status is pending
        if conn.get("status") != "pending":
            raise HTTPException(status_code=400, detail="This request has already been processed")

        if action == "accept":
            # Update status to accepted
            client.table("follows").update({
                "status": "accepted",
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", connection_id).execute()

            # Update follower/following counts
            follower_id = conn["follower_id"]
            following_id = conn["following_id"]

            # Increment following count for follower
            follower_profile = client.table("profiles").select("following_count").eq("id", follower_id).execute()
            current_following = follower_profile.data[0].get("following_count", 0) if follower_profile.data else 0
            client.table("profiles").update({"following_count": current_following + 1}).eq("id", follower_id).execute()

            # Increment followers count for following
            following_profile = client.table("profiles").select("followers_count").eq("id", following_id).execute()
            current_followers = following_profile.data[0].get("followers_count", 0) if following_profile.data else 0
            client.table("profiles").update({"followers_count": current_followers + 1}).eq("id", following_id).execute()

            # Create notification for requester
            try:
                # Get accepter profile for message
                accepter_profile = client.table("profiles").select("full_name, username").eq("id", following_id).execute()
                accepter_name = accepter_profile.data[0].get("full_name", "Someone") if accepter_profile.data else "Someone"
                accepter_username = accepter_profile.data[0].get("username", "") if accepter_profile.data else ""
                
                notification_data = {
                    "user_id": follower_id,
                    "type": "request_accepted",
                    "from_user_id": following_id,
                    "message": f"{accepter_name} (@{accepter_username}) accepted your follow request",
                    "is_read": False,
                    "created_at": datetime.utcnow().isoformat()
                }
                client.table("notifications").insert(notification_data).execute()
            except Exception as e:
                print(f"[respond_to_connection_request] Failed to create notification: {e}")

            return {
                "success": True,
                "message": "Connection request accepted",
                "status": "accepted"
            }
        else:  # reject
            # Delete the connection request
            client.table("follows").delete().eq("id", connection_id).execute()

            return {
                "success": True,
                "message": "Connection request rejected",
                "status": "rejected"
            }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error responding to connection request: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/connections/{target_user_id}")
async def remove_connection(
    target_user_id: str,
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """
    Unfollow or remove a friend connection.
    Can be called by either party.
    """
    try:
        user_id = auth_data["user_id"]
        client = auth_data["client"]

        # Find the connection where user is follower
        connection = client.table("follows").select("*").eq("follower_id", user_id).eq("following_id", target_user_id).execute()
        
        # If not found, check if user is being followed (for mutual unfollow)
        if not connection.data:
            connection = client.table("follows").select("*").eq("follower_id", target_user_id).eq("following_id", user_id).execute()

        if not connection.data:
            raise HTTPException(status_code=404, detail="Connection not found")

        conn = connection.data[0]
        connection_id = conn["id"]

        # Only delete if status is accepted (can't cancel pending requests this way)
        if conn.get("status") == "accepted":
            # Update counts before deleting
            follower_id = conn["follower_id"]
            following_id = conn["following_id"]

            # Decrement following count for follower
            follower_profile = client.table("profiles").select("following_count").eq("id", follower_id).execute()
            if follower_profile.data:
                current_following = follower_profile.data[0].get("following_count", 0)
                client.table("profiles").update({"following_count": max(0, current_following - 1)}).eq("id", follower_id).execute()

            # Decrement followers count for following
            following_profile = client.table("profiles").select("followers_count").eq("id", following_id).execute()
            if following_profile.data:
                current_followers = following_profile.data[0].get("followers_count", 0)
                client.table("profiles").update({"followers_count": max(0, current_followers - 1)}).eq("id", following_id).execute()

        # Delete the connection
        client.table("follows").delete().eq("id", connection_id).execute()

        return {
            "success": True,
            "message": "Connection removed successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error removing connection: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/connections/followers")
async def get_followers(
    user_id: Optional[str] = Query(None, description="User ID to get followers for. Defaults to current user."),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    auth_data: Optional[dict] = Depends(get_authenticated_supabase_client)
):
    """
    Get list of followers for a user.
    Visibility rules:
    - Own profile: Always visible
    - Public account: Anyone can see
    - Private account: Only if current user follows them AND they follow back (mutual follow)
    """
    try:
        if auth_data:
            client = auth_data["client"]
            current_user_id = auth_data["user_id"]
        else:
            client = supabase
            current_user_id = None

        target_user_id = user_id or current_user_id
        if not target_user_id:
            raise HTTPException(status_code=400, detail="user_id is required")

        # Check if viewing own profile
        is_own_profile = current_user_id and current_user_id == target_user_id

        # Get target user's profile to check privacy
        target_profile = client.table("profiles").select("id, is_private").eq("id", target_user_id).execute()
        if not target_profile.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        target_is_private = target_profile.data[0].get("is_private", False)

        # Check visibility rules
        if not is_own_profile and target_is_private:
            # Private account - check if mutual follow
            if not current_user_id:
                raise HTTPException(status_code=403, detail="You must be logged in to view this user's followers")
            
            # Check if current user follows target
            current_follows_target = client.table("follows").select("id").eq("follower_id", current_user_id).eq("following_id", target_user_id).eq("status", "accepted").execute()
            if not current_follows_target.data:
                raise HTTPException(status_code=403, detail="You must follow this user to see their followers")
            
            # Check if target follows current user back (mutual follow)
            target_follows_current = client.table("follows").select("id").eq("follower_id", target_user_id).eq("following_id", current_user_id).eq("status", "accepted").execute()
            if not target_follows_current.data:
                raise HTTPException(status_code=403, detail="This user must follow you back to see their followers")

        # Calculate offset
        offset = (page - 1) * limit

        # Get followers with profile info
        followers = client.table("follows").select(
            "id, status, created_at, follower_id"
        ).eq("following_id", target_user_id).eq("status", "accepted").order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        
        # Get profile info for each follower
        follower_ids = [f["follower_id"] for f in followers.data]
        follower_profiles = {}
        if follower_ids:
            profiles_result = client.table("profiles").select("id, full_name, username, profile_url, bio").in_("id", follower_ids).execute()
            follower_profiles = {p["id"]: p for p in profiles_result.data}
        
        # Combine data
        followers_with_profiles = []
        for f in followers.data:
            profile = follower_profiles.get(f["follower_id"])
            if profile:
                followers_with_profiles.append({
                    **f,
                    "follower": profile
                })

        # Get total count
        count_result = client.table("follows").select("id").eq("following_id", target_user_id).eq("status", "accepted").execute()
        total_count = len(count_result.data)

        # Check if current user follows each follower (for follow back button)
        follower_ids = [f["follower"]["id"] for f in followers.data if f.get("follower")]
        following_map = {}
        if current_user_id and follower_ids:
            following_check = client.table("follows").select("following_id").eq("follower_id", current_user_id).eq("status", "accepted").in_("following_id", follower_ids).execute()
            following_map = {f["following_id"]: True for f in following_check.data}

        # Format response
        formatted_followers = []
        for f in followers_with_profiles:
            if not f.get("follower"):
                continue
            follower_profile = f["follower"]
            formatted_followers.append({
                "connection_id": f["id"],
                "user_id": follower_profile["id"],
                "full_name": follower_profile.get("full_name"),
                "username": follower_profile.get("username"),
                "profile_url": follower_profile.get("profile_url"),
                "bio": follower_profile.get("bio"),
                "is_following_back": following_map.get(follower_profile["id"], False),
                "followed_at": f.get("created_at")
            })

        return {
            "success": True,
            "followers": formatted_followers,
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
        print(f"Error getting followers: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/connections/following")
async def get_following(
    user_id: Optional[str] = Query(None, description="User ID to get following list for. Defaults to current user."),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    auth_data: Optional[dict] = Depends(get_authenticated_supabase_client)
):
    """
    Get list of users that a user is following.
    Visibility rules:
    - Own profile: Always visible
    - Public account: Anyone can see
    - Private account: Only if current user follows them AND they follow back (mutual follow)
    """
    try:
        if auth_data:
            client = auth_data["client"]
            current_user_id = auth_data["user_id"]
        else:
            client = supabase
            current_user_id = None

        target_user_id = user_id or current_user_id
        if not target_user_id:
            raise HTTPException(status_code=400, detail="user_id is required")

        # Check if viewing own profile
        is_own_profile = current_user_id and current_user_id == target_user_id

        # Get target user's profile to check privacy
        target_profile = client.table("profiles").select("id, is_private").eq("id", target_user_id).execute()
        if not target_profile.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        target_is_private = target_profile.data[0].get("is_private", False)

        # Check visibility rules
        if not is_own_profile and target_is_private:
            # Private account - check if mutual follow
            if not current_user_id:
                raise HTTPException(status_code=403, detail="You must be logged in to view this user's following")
            
            # Check if current user follows target
            current_follows_target = client.table("follows").select("id").eq("follower_id", current_user_id).eq("following_id", target_user_id).eq("status", "accepted").execute()
            if not current_follows_target.data:
                raise HTTPException(status_code=403, detail="You must follow this user to see their following")
            
            # Check if target follows current user back (mutual follow)
            target_follows_current = client.table("follows").select("id").eq("follower_id", target_user_id).eq("following_id", current_user_id).eq("status", "accepted").execute()
            if not target_follows_current.data:
                raise HTTPException(status_code=403, detail="This user must follow you back to see their following")

        # Calculate offset
        offset = (page - 1) * limit

        # Get following with profile info
        following = client.table("follows").select(
            "id, status, created_at, following_id"
        ).eq("follower_id", target_user_id).eq("status", "accepted").order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        
        # Get profile info for each following
        following_ids = [f["following_id"] for f in following.data]
        following_profiles = {}
        if following_ids:
            profiles_result = client.table("profiles").select("id, full_name, username, profile_url, bio").in_("id", following_ids).execute()
            following_profiles = {p["id"]: p for p in profiles_result.data}
        
        # Combine data
        following_with_profiles = []
        for f in following.data:
            profile = following_profiles.get(f["following_id"])
            if profile:
                following_with_profiles.append({
                    **f,
                    "following": profile
                })

        # Get total count
        count_result = client.table("follows").select("id").eq("follower_id", target_user_id).eq("status", "accepted").execute()
        total_count = len(count_result.data)

        # Format response
        formatted_following = []
        for f in following_with_profiles:
            if not f.get("following"):
                continue
            following_profile = f["following"]
            formatted_following.append({
                "connection_id": f["id"],
                "user_id": following_profile["id"],
                "full_name": following_profile.get("full_name"),
                "username": following_profile.get("username"),
                "profile_url": following_profile.get("profile_url"),
                "bio": following_profile.get("bio"),
                "followed_at": f.get("created_at")
            })

        return {
            "success": True,
            "following": formatted_following,
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
        print(f"Error getting following: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/connections/requests")
async def get_pending_requests(
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """
    Get pending connection requests for current user.
    """
    try:
        user_id = auth_data["user_id"]
        client = auth_data["client"]

        # Get pending requests where current user is the target
        requests = client.table("follows").select(
            "id, status, created_at, connection_type, follower_id"
        ).eq("following_id", user_id).eq("status", "pending").order("created_at", desc=True).execute()
        
        # Get profile info for each requester
        requester_ids = [r["follower_id"] for r in requests.data]
        requester_profiles = {}
        if requester_ids:
            profiles_result = client.table("profiles").select("id, full_name, username, profile_url, bio").in_("id", requester_ids).execute()
            requester_profiles = {p["id"]: p for p in profiles_result.data}
        
        # Combine data
        requests_with_profiles = []
        for r in requests.data:
            profile = requester_profiles.get(r["follower_id"])
            if profile:
                requests_with_profiles.append({
                    **r,
                    "follower": profile
                })

        # Format response
        formatted_requests = []
        for req in requests_with_profiles:
            if not req.get("follower"):
                continue
            requester_profile = req["follower"]
            formatted_requests.append({
                "connection_id": req["id"],
                "user_id": requester_profile["id"],
                "full_name": requester_profile.get("full_name"),
                "username": requester_profile.get("username"),
                "profile_url": requester_profile.get("profile_url"),
                "bio": requester_profile.get("bio"),
                "connection_type": req.get("connection_type", "follow"),
                "requested_at": req.get("created_at")
            })

        return {
            "success": True,
            "requests": formatted_requests
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting pending requests: {e}")
        raise HTTPException(status_code=500, detail=str(e))

