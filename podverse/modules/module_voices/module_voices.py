from connection_supabase_client import supabase
import os
import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from connection_supabase_client import get_authenticated_supabase_client, get_service_role_client

router = APIRouter()


# Voice metadata (name must match file name)
# VOICE_DATA = [
#     {
#         "name": "Daniel",
#         "categories": ["English", "British", "Male", "Informative", "Educational"],
#         "description": "A strong voice perfect for delivering a professional broadcast or news."
#     },
#     {
#         "name": "Brian",
#         "categories": ["English", "American", "Male", "Social Media", "Middle-aged"],
#         "description": "Middle-aged man with a resonant and comforting tone. Great for narrations."
#     },
#     {
#         "name": "Lily",
#         "categories": ["English", "Italian", "Female", "Conversational", "News"],
#         "description": "Velvety British female voice delivers news and narrations with warmth."
#     },
#     {
#         "name": "Jessica",
#         "categories": ["English", "American", "Female", "Conversational", "Young"],
#         "description": "Young and popular, this playful American female voice is perfect for trending content."
#     },
#     {
#         "name": "Alice",
#         "categories": ["English", "British", "Female", "Advertisement", "Friendly"],
#         "description": "Clear and engaging, friendly woman with a British accent suitable for ads."
#     },
#     {
#         "name": "Sully",
#         "categories": ["English", "American", "Male", "Narrative", "Story"],
#         "description": "Deep mature american male."
#     },
#     {
#         "name": "Hale",
#         "categories": ["English", "American", "Male", "Advertisement", "Confident"],
#         "description": "Deep mature american male."
#     },
#     {
#         "name": "George",
#         "categories": ["English", "British", "Male", "Story", "Warm"],
#         "description": "Warm resonance that instantly captures audience."
#     },
#     {
#         "name": "River",
#         "categories": ["English", "American", "Female", "Conversational", "Young"],
#         "description": "A relaxed, neutral voice ready for narrations or conversational projects."
#     },
#     {
#         "name": "Matilda",
#         "categories": ["English", "American", "Female", "Informative", "Educational"],
#         "description": "A professional woman with a pleasing alto pitch. Suitable for many uses."
#     },
# ]

# def upload_and_store_voices():
#     VOICE_FOLDER = os.path.join(os.path.dirname(__file__), "voices")
#     STORAGE_FOLDER = "voices/sample_voices"

#     for voice in VOICE_DATA:
#         filename = f"voice_preview_{voice['name'].lower()}.mp3"
        
#         file_path = os.path.join(VOICE_FOLDER, filename)

#         if not os.path.exists(file_path):
#             print(f"❌ File not found: {file_path}")
#             continue

#         with open(file_path, "rb") as f:
#             storage_path = f"{STORAGE_FOLDER}/{filename}"
#             supabase.storage.from_("voices").upload(
#                 storage_path,
#                 f,
#                 {
#                     "x-upsert": "true",
#                     "cache-control": "max-age=3600"
#                 }
#             )


#             public_url = supabase.storage.from_("voices").get_public_url(storage_path)

#         print(f"✅ Uploaded {filename} → {public_url}")

#         # Insert metadata into `sample_voices`
#         supabase.table("sample_voices").insert({
#             "name": voice["name"],
#             "description": voice["description"],
#             "categories": voice["categories"],
#             "audio_url": public_url
#         }).execute()

#         print(f"🗂️  Inserted metadata for {voice['name']} into 'sample_voices'")


# if __name__ == "__main__":
#     upload_and_store_voices()


@router.get("/sample-voices/")
async def get_sample_voices(auth_data: dict = Depends(get_authenticated_supabase_client)):
    """
    Fetch all sample voice files from the sample_voices table
    """
    user_id = auth_data["user_id"]

    try:
        service_client = get_service_role_client()
        response = service_client.table("sample_voices").select("*").execute()

        if not response.data:
            return JSONResponse(
                content={"error": "No sample voices found.", "user_id": user_id},
                status_code=404
            )

        voices_list = [
            {
                "id": voice["id"],
                "name": voice["name"],
                "category": voice.get("category", []),
                "description": voice.get("description", ""),
                "audioSrc": voice.get("audiourl", ""),
                "created_at": voice.get("created_at", "")
            }
            for voice in response.data
        ]

        return JSONResponse(
            content={"success": True, "data": voices_list, "total_voices": len(voices_list)}
        )

    except Exception as e:
        print(f"Error fetching sample voices: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sample-voices/{voice_id}")
async def get_sample_voice_by_id(
    voice_id: str,
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """
    Fetch a specific sample voice by ID
    """
    try:
        service_client = get_service_role_client()
        response = service_client.table("sample_voices").select("*").eq("id", voice_id).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail=f"Voice with ID {voice_id} not found")

        voice = response.data[0]

        voice_data = {
            "id": voice["id"],
            "name": voice["name"],
            "category": voice.get("category", []),
            "description": voice.get("description", ""),
            "audioSrc": voice.get("audiourl", ""), 
            "created_at": voice.get("created_at", "")
        }

        return JSONResponse(content={"success": True, "data": voice_data})

    except Exception as e:
        print(f"Error fetching voice by ID: {e}")
        raise HTTPException(status_code=500, detail=str(e))

