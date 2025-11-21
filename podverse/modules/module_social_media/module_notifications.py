from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from connection_supabase_client import supabase, get_authenticated_supabase_client
from datetime import datetime

router = APIRouter()

# ==================== Notification Endpoints ====================

@router.get("/notifications")
async def get_notifications(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    unread_only: bool = Query(False),
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """Get notifications for current user"""
    try:
        user_id = auth_data["user_id"]
        client = auth_data["client"]

        # Calculate offset
        offset = (page - 1) * limit

        # Build query
        query = client.table("notifications").select("*").eq("user_id", user_id)
        
        if unread_only:
            query = query.eq("is_read", False)
        
        notifications = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()

        # Get total count
        count_query = client.table("notifications").select("id").eq("user_id", user_id)
        if unread_only:
            count_query = count_query.eq("is_read", False)
        count_result = count_query.execute()
        total_count = len(count_result.data)

        # Get profile info for notification senders
        notification_list = notifications.data or []
        user_ids = []
        for notif in notification_list:
            from_user_id = notif.get("from_user_id")
            if from_user_id:
                user_ids.append(from_user_id)

        # Fetch profiles
        profiles_dict = {}
        if user_ids:
            profiles = client.table("profiles").select("id, full_name, username, profile_url").in_("id", user_ids).execute()
            profiles_dict = {p["id"]: p for p in (profiles.data or [])}

        # Get connection IDs for follow_request notifications
        # Only include connection_id for the MOST RECENT pending request from each user
        connection_ids_map = {}
        follow_request_notifs = [n for n in notification_list if n.get("type") == "follow_request" and n.get("from_user_id")]
        if follow_request_notifs:
            requester_ids = [n.get("from_user_id") for n in follow_request_notifs]
            # Find pending connections
            connections = client.table("follows").select("id, follower_id, created_at").eq("following_id", user_id).eq("status", "pending").in_("follower_id", requester_ids).order("created_at", desc=True).execute()
            if connections.data:
                # Group by follower_id and only keep the most recent one for each user
                seen_followers = set()
                for conn in connections.data:
                    follower_id = conn["follower_id"]
                    # Only add if we haven't seen this follower_id yet (most recent first due to ordering)
                    if follower_id not in seen_followers:
                        connection_ids_map[follower_id] = conn["id"]
                        seen_followers.add(follower_id)

        # Format notifications with profile info
        formatted_notifications = []
        # Track which users already have a connection_id assigned (only most recent notification gets it)
        users_with_connection_id = set()
        
        for notif in notification_list:
            from_user_id = notif.get("from_user_id")
            profile = profiles_dict.get(from_user_id) if from_user_id else None
            
            # Use message from database, or generate one if missing
            message = notif.get("message")
            if not message and profile:
                message = get_notification_message(notif["type"], profile)
            elif not message:
                message = "You have a new notification"

            # Get connection_id for follow_request notifications
            # Only assign connection_id to the FIRST (most recent) follow_request notification from each user
            connection_id = None
            if notif.get("type") == "follow_request" and from_user_id:
                if from_user_id not in users_with_connection_id:
                    connection_id = connection_ids_map.get(from_user_id)
                    if connection_id:
                        users_with_connection_id.add(from_user_id)

            formatted_notif = {
                "id": notif["id"],
                "type": notif["type"],
                "message": message,
                "metadata": {
                    "from_user_id": from_user_id,
                    "connection_id": connection_id
                },
                "is_read": notif["is_read"],
                "created_at": notif["created_at"],
                "from_user": profile
            }
            formatted_notifications.append(formatted_notif)

        return {
            "success": True,
            "notifications": formatted_notifications,
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
        print(f"Error getting notifications: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/notifications/unread-count")
async def get_unread_count(
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """Get count of unread notifications"""
    try:
        user_id = auth_data["user_id"]
        client = auth_data["client"]

        result = client.table("notifications").select("id").eq("user_id", user_id).eq("is_read", False).execute()
        count = len(result.data) if result.data else 0

        return {
            "success": True,
            "unread_count": count
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting unread count: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """Mark a notification as read"""
    try:
        user_id = auth_data["user_id"]
        client = auth_data["client"]

        # Verify notification belongs to user
        notif = client.table("notifications").select("user_id").eq("id", notification_id).execute()
        if not notif.data or notif.data[0]["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")

        # Update notification
        client.table("notifications").update({
            "is_read": True
        }).eq("id", notification_id).execute()

        return {
            "success": True,
            "message": "Notification marked as read"
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error marking notification as read: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/notifications/read-all")
async def mark_all_notifications_read(
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """Mark all notifications as read"""
    try:
        user_id = auth_data["user_id"]
        client = auth_data["client"]

        client.table("notifications").update({
            "is_read": True
        }).eq("user_id", user_id).eq("is_read", False).execute()

        return {
            "success": True,
            "message": "All notifications marked as read"
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error marking all notifications as read: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def get_notification_message(notification_type: str, profile: Optional[dict]) -> str:
    """Generate notification message based on type"""
    username = profile.get("username", "Someone") if profile else "Someone"
    full_name = profile.get("full_name", username) if profile else "Someone"

    messages = {
        "follow_request": f"{full_name} (@{username}) sent you a follow request",
        "new_follower": f"{full_name} (@{username}) started following you",
        "request_accepted": f"{full_name} (@{username}) accepted your follow request",
        "request_rejected": f"{full_name} (@{username}) rejected your follow request",
        "post_like": f"{full_name} (@{username}) liked your post",
        "post_comment": f"{full_name} (@{username}) commented on your post",
        "post_mention": f"{full_name} (@{username}) mentioned you in a post"
    }

    return messages.get(notification_type, "You have a new notification")

