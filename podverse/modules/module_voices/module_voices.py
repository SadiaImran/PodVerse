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
    Fetch all Gemini voice files from the voices/voices_gemini bucket folder
    """
    user_id = auth_data["user_id"]

    try:
        service_client = get_service_role_client()
        bucket_name = "voices"
        folder_path = "voices_gemini"
        
        # List all files in the voices_gemini folder
        try:
            response = service_client.storage.from_(bucket_name).list(folder_path)
        except Exception as list_error:
            print(f"Error listing files from bucket: {list_error}")
            # Try listing from root if folder_path doesn't work
            try:
                response = service_client.storage.from_(bucket_name).list()
                # Filter files that are in the voices_gemini folder
                response = [f for f in response if f.get("name", "").startswith(f"{folder_path}/") or (folder_path in f.get("name", ""))]
            except Exception as fallback_error:
                print(f"Fallback list also failed: {fallback_error}")
                raise HTTPException(status_code=500, detail=f"Failed to list files from bucket: {str(list_error)}")
        
        if not response or len(response) == 0:
            return JSONResponse(
                content={"error": "No voices found in bucket.", "user_id": user_id},
                status_code=404
            )

        voices_list = []
        
        # Process each file in the folder
        for file_info in response:
            # Handle both dict and string responses
            if isinstance(file_info, str):
                filename = file_info
                file_metadata = {}
            elif isinstance(file_info, dict):
                filename = file_info.get("name", "")
                file_metadata = file_info
            else:
                continue
            
            # Skip if no filename or if it's a directory (no extension)
            if not filename or "." not in filename:
                continue
            
            # Only process audio files (wav, mp3, etc.)
            if filename.endswith((".wav", ".mp3", ".m4a", ".ogg", ".flac")):
                
                # Extract voice name from filename
                # Format: preview_Achernar.wav -> Achernar
                voice_name = filename
                if filename.startswith("preview_"):
                    voice_name = filename.replace("preview_", "").replace("_", " ")
                if filename.endswith(".wav"):
                    voice_name = voice_name.replace(".wav", "")
                elif filename.endswith(".mp3"):
                    voice_name = voice_name.replace(".mp3", "")
                elif filename.endswith(".m4a"):
                    voice_name = voice_name.replace(".m4a", "")
                
                # Capitalize first letter of each word
                voice_name = " ".join(word.capitalize() for word in voice_name.split())
                
                # Generate public URL for the file
                file_path = f"{folder_path}/{filename}"
                public_url = service_client.storage.from_(bucket_name).get_public_url(file_path)
                
                # Create voice object
                voice_data = {
                    "id": filename,  # Use filename as ID since we don't have database IDs
                    "name": voice_name,
                    "category": ["Gemini", "AI Voice"],  # Default categories
                    "description": f"Gemini AI voice: {voice_name}",
                    "audioSrc": public_url,
                    "filename": filename,
                    "created_at": file_metadata.get("created_at", ""),
                    "updated_at": file_metadata.get("updated_at", "")
                }
                
                voices_list.append(voice_data)
        
        # Sort voices by name
        voices_list.sort(key=lambda x: x["name"])

        return JSONResponse(
            content={"success": True, "data": voices_list, "total_voices": len(voices_list)}
        )

    except Exception as e:
        print(f"Error fetching voices from bucket: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sample-voices/{voice_id}")
async def get_sample_voice_by_id(
    voice_id: str,
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """
    Fetch a specific voice by filename (voice_id is the filename)
    """
    try:
        service_client = get_service_role_client()
        bucket_name = "voices"
        folder_path = "voices_gemini"
        
        # List all files and find the matching one
        response = service_client.storage.from_(bucket_name).list(folder_path)
        
        if not response:
            raise HTTPException(status_code=404, detail=f"Voice folder not found")
        
        # Find the file matching the voice_id (filename)
        for file_info in response:
            # Handle both dict and string responses
            if isinstance(file_info, str):
                filename = file_info
            elif isinstance(file_info, dict):
                filename = file_info.get("name", "")
            else:
                continue
            
            if filename == voice_id:
                
                # Extract voice name from filename
                voice_name = filename
                if filename.startswith("preview_"):
                    voice_name = filename.replace("preview_", "").replace("_", " ")
                if filename.endswith(".wav"):
                    voice_name = voice_name.replace(".wav", "")
                elif filename.endswith(".mp3"):
                    voice_name = voice_name.replace(".mp3", "")
                elif filename.endswith(".m4a"):
                    voice_name = voice_name.replace(".m4a", "")
                
                # Capitalize first letter of each word
                voice_name = " ".join(word.capitalize() for word in voice_name.split())
                
                # Generate public URL
                file_path = f"{folder_path}/{filename}"
                public_url = service_client.storage.from_(bucket_name).get_public_url(file_path)
                
                # Get metadata
                file_metadata = file_info if isinstance(file_info, dict) else {}
                
                voice_data = {
                    "id": filename,
                    "name": voice_name,
                    "category": ["Gemini", "AI Voice"],
                    "description": f"Gemini AI voice: {voice_name}",
                    "audioSrc": public_url,
                    "filename": filename,
                    "created_at": file_metadata.get("created_at", ""),
                    "updated_at": file_metadata.get("updated_at", "")
                }
                
                return JSONResponse(content={"success": True, "data": voice_data})
        
        raise HTTPException(status_code=404, detail=f"Voice with ID {voice_id} not found")

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching voice by ID: {e}")
        raise HTTPException(status_code=500, detail=str(e))

