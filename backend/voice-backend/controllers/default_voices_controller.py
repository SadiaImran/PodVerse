from fastapi import HTTPException, Body, status
from typing import List, Union
from models.default_sample_audio_model import DefaultSampleAudio
from bson import ObjectId
from config import db  # <-- yahan se import karo

COLLECTION = "default_voices"

def voice_doc_to_dict(doc):
    doc["id"] = str(doc["_id"])
    doc.pop("_id", None)
    return doc

async def get_all_default_voices():
    print("Fetching voices...")  # <-- Add this
    voices = []
    cursor = db[COLLECTION].find()
    async for doc in cursor:
        print(doc)  # <-- Add this
        voices.append(voice_doc_to_dict(doc))
    print("Done fetching.")  # <-- Add this
    return {"success": True, "data": voices}

async def create_default_voice(
    voices: Union[List[DefaultSampleAudio], DefaultSampleAudio] = Body(...),
):
    if not isinstance(voices, list):
        voices = [voices]
    docs = [voice.model_dump() for voice in voices]
    result = await db[COLLECTION].insert_many(docs)
    inserted_ids = result.inserted_ids
    created_docs = []
    for oid in inserted_ids:
        doc = await db[COLLECTION].find_one({"_id": oid})
        created_docs.append(voice_doc_to_dict(doc))
    return {"success": True, "data": created_docs}

async def update_default_voice(id: str, updatedFields: dict = Body(...)):
    result = await db[COLLECTION].find_one_and_update(
        {"_id": ObjectId(id)},
        {"$set": updatedFields},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Voice not found")
    return {"success": True, "data": voice_doc_to_dict(result)}

async def delete_default_voice(id: str):
    result = await db[COLLECTION].find_one_and_delete({"_id": ObjectId(id)})
    if not result:
        raise HTTPException(status_code=404, detail="Voice not found")
    return {"success": True, "message": "Voice deleted"}