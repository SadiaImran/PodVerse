from pydantic import BaseModel, Field
from typing import List

class DefaultSampleAudio(BaseModel):
    name: str = Field(..., description="Voice name")
    category: List[str] = Field(..., description="Categories")
    audioSrc: str = Field(..., description="Audio file URL")
    description: str = Field(..., description="Description")