from connection_supabase_client import supabase
import os
import json

# Voice metadata (name must match file name)
VOICE_DATA = [
    {
        "name": "Daniel",
        "categories": ["English", "British", "Male", "Informative", "Educational"],
        "description": "A strong voice perfect for delivering a professional broadcast or news."
    },
    {
        "name": "Brian",
        "categories": ["English", "American", "Male", "Social Media", "Middle-aged"],
        "description": "Middle-aged man with a resonant and comforting tone. Great for narrations."
    },
    {
        "name": "Lily",
        "categories": ["English", "Italian", "Female", "Conversational", "News"],
        "description": "Velvety British female voice delivers news and narrations with warmth."
    },
    {
        "name": "Jessica",
        "categories": ["English", "American", "Female", "Conversational", "Young"],
        "description": "Young and popular, this playful American female voice is perfect for trending content."
    },
    {
        "name": "Alice",
        "categories": ["English", "British", "Female", "Advertisement", "Friendly"],
        "description": "Clear and engaging, friendly woman with a British accent suitable for ads."
    },
    {
        "name": "Sully",
        "categories": ["English", "American", "Male", "Narrative", "Story"],
        "description": "Deep mature american male."
    },
    {
        "name": "Hale",
        "categories": ["English", "American", "Male", "Advertisement", "Confident"],
        "description": "Deep mature american male."
    },
    {
        "name": "George",
        "categories": ["English", "British", "Male", "Story", "Warm"],
        "description": "Warm resonance that instantly captures audience."
    },
    {
        "name": "River",
        "categories": ["English", "American", "Female", "Conversational", "Young"],
        "description": "A relaxed, neutral voice ready for narrations or conversational projects."
    },
    {
        "name": "Matilda",
        "categories": ["English", "American", "Female", "Informative", "Educational"],
        "description": "A professional woman with a pleasing alto pitch. Suitable for many uses."
    },
]

def upload_and_store_voices():
    VOICE_FOLDER = os.path.join(os.path.dirname(__file__), "voices")
    STORAGE_FOLDER = "voices/sample_voices"

    for voice in VOICE_DATA:
        filename = f"voice_preview_{voice['name'].lower()}.mp3"
        
        file_path = os.path.join(VOICE_FOLDER, filename)

        if not os.path.exists(file_path):
            print(f"❌ File not found: {file_path}")
            continue

        with open(file_path, "rb") as f:
            storage_path = f"{STORAGE_FOLDER}/{filename}"
            supabase.storage.from_("voices").upload(
                storage_path,
                f,
                {
                    "x-upsert": "true",
                    "cache-control": "max-age=3600"
                }
            )


            public_url = supabase.storage.from_("voices").get_public_url(storage_path)

        print(f"✅ Uploaded {filename} → {public_url}")

        # Insert metadata into `sample_voices`
        supabase.table("sample_voices").insert({
            "name": voice["name"],
            "description": voice["description"],
            "categories": voice["categories"],
            "audio_url": public_url
        }).execute()

        print(f"🗂️  Inserted metadata for {voice['name']} into 'sample_voices'")


if __name__ == "__main__":
    upload_and_store_voices()
