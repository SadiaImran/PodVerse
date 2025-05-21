from TTS.api import TTS
import os
import torch
from functools import partial

original_load = torch.load
torch.load = lambda *args, **kwargs: original_load(*args, **kwargs, weights_only=False)
use_gpu = torch.cuda.is_available()
print(f"GPU acceleration {'enabled' if use_gpu else 'disabled'}")


tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2", gpu=use_gpu , progress_bar=False,)

def clone_voice(text_input: str, speaker_paths: list[str], output_path: str):
    tts.tts_to_file(
        text=text_input,
        speaker_wav=speaker_paths,
        file_path=output_path,
        split_sentences=True,
        language="en" 
    )

