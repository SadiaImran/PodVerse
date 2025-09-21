from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from connection_supabase_client import get_authenticated_supabase_client, get_service_role_client

router = APIRouter()


@router.get("/stock-audio/")
async def get_stock_audio_files(auth_data: dict = Depends(get_authenticated_supabase_client)):
    """
    Fetch all audio files from the sounds table
    """
    
    user_id = auth_data["user_id"]
        
    try:
        # Use service role client for database operations
        service_client = get_service_role_client()
        
        # Query the sounds table
        response = service_client.table("sounds").select("*").execute()
        
        if not response.data or len(response.data) == 0:
            return JSONResponse(content={
                "error": "No audio files found in the sounds table.",
                "user_id": user_id
            }, status_code=404)
        
        # Organize files by category
        organized_files = {
            "ambient": [],
            "audience": [],
            "music": [],
            "transitions": []
        }
        
        print(f"Processing {len(response.data)} files from sounds table...")
        
        for sound in response.data:
            # Create a clean display name from the name field
            display_name = sound["name"].replace("_", " ").title()
            
            # Format file size
            size_mb = round(float(sound["size"]), 2)
            
            # Convert duration to float
            duration = float(sound["duration"]) if sound["duration"] else 0
            
            file_data = {
                "id": sound["id"],  # Use UUID as ID
                "name": display_name,
                "filename": sound["name"],
                "category": sound["category"],
                "size": f"{size_mb} MB",
                "duration": duration,  # Duration is already in the table
                "created_at": sound["created_at"],
                "mimetype": sound["mimetype"],
                "path": sound["path"]  # Include path for audio URL generation
            }
            
            category = sound["category"]
            if category in organized_files:
                organized_files[category].append(file_data)
            else:
                # If category not in our predefined list, add it
                if category not in organized_files:
                    organized_files[category] = []
                organized_files[category].append(file_data)
        
        return JSONResponse(content={
            "success": True,
            "data": organized_files,
            "total_files": len(response.data)
        })
        
    except Exception as e:
        print(f"Error fetching stock audio files: {e}")
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/audio-url/{sound_id}")
async def get_audio_url(
    sound_id: str,
    auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """
    Get signed URL for audio file using sound ID from sounds table
    """
    try:
        service_client = get_service_role_client()

        # First, get the path from the sounds table using the sound ID
        sound_response = service_client.table("sounds").select("path").eq("id", sound_id).execute()
        
        if not sound_response.data or len(sound_response.data) == 0:
            raise HTTPException(status_code=404, detail="Sound not found")

        file_path = sound_response.data[0]["path"]

        # Generate signed URL using the path from the table
        response = service_client.storage.from_("sounds").create_signed_url(
            file_path, 
            3600
        )
        if response.get("error"):
            raise HTTPException(status_code=404, detail="File not found in storage")

        return JSONResponse(content={
            "success": True,
            "url": response.get("signedURL"),
            "expires_in": 3600
        })
        
    except Exception as e:
        print(f"Error getting audio URL: {e}")
        return JSONResponse(content={"error": str(e)}, status_code=500)

