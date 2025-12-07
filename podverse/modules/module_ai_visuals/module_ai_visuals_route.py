import os
import random
import urllib.parse
# import replicate 
from fastapi import APIRouter, HTTPException, Form
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

@router.post("/generate-image")
async def generate_image(
    prompt: str = Form(...),
    aspect_ratio: str = Form("16:9"),
    output_format: str = Form("png")
):
    """
    Generate an image using Pollinations.ai (Free, No API Key).
    Uses the 'flux' model parameter for best quality.
    """
    try:
        print(f"🎨 Generating image for: {prompt} (Aspect: {aspect_ratio})")
        
        # Calculate dimensions based on aspect ratio
        # Pollinations supports up to roughly 2048x2048 total pixels
        width, height = 1280, 720 # Default 16:9
        
        if aspect_ratio == "1:1":
            width, height = 1024, 1024
        elif aspect_ratio == "9:16":
            width, height = 720, 1280
        elif aspect_ratio == "16:9":
            width, height = 1280, 720
            
        # Encode prompt
        encoded_prompt = urllib.parse.quote(prompt)
        
        # Generate random seed for variety
        seed = random.randint(0, 1000000)
        
        # Pollinations URL construction
        # model=flux gives the best photorealism currently available on Pollinations
        # nologo=true attempts to hide the watermark (works sometimes)
        image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width={width}&height={height}&model=flux&seed={seed}&nologo=true"
        
        print(f"✅ Image URL generated: {image_url}")
        
        # Return directly. The frontend will load this URL.
        # Note: Pollinations generates on-the-fly when the URL is accessed.
        return {"success": True, "image_url": image_url}

    except Exception as e:
        print(f"❌ Generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
