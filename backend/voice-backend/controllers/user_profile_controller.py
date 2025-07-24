from fastapi import HTTPException
from bson import ObjectId
from models.user_profile_model import UserProfile
from config import db  # Your MongoDB instance from db config

collection = db.get_collection("users")

def serialize_user(doc):
    return {
        "id": str(doc["_id"]),
        "fullName": doc.get("fullName"),
        "email": doc.get("email"),
        "isVerified": doc.get("isVerified", False),
        "otp": doc.get("otp"),
        "provider": doc.get("provider", "email"),
        "resetPasswordToken": doc.get("resetPasswordToken"),
        "resetPasswordExpires": doc.get("resetPasswordExpires"),
        "profileUrl": doc.get("profileUrl"),
    }

# 🚀 Update profile with flexible fields
async def update_profile(id: str, update_data: UserProfile):
    try:
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        if not update_dict:
            raise HTTPException(status_code=400, detail="No valid fields provided to update")

        result = await collection.update_one(
            {"_id": ObjectId(id)},
            {"$set": update_dict}
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")

        updated_user = await collection.find_one({"_id": ObjectId(id)})
        return {
            "success": True,
            "message": "User profile updated successfully",
            "data": serialize_user(updated_user)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


