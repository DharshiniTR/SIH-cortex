"""
Loader for Qwen2.5-VL-3B-Instruct.

- Downloads once on first call, then reuses the HuggingFace cache
  (~/.cache/huggingface) on every later call/run — no re-download.
- MODEL_PATH is configurable via the SEVAALERT_MODEL_PATH env var so this
  can later point at a local/quantized checkpoint instead of the HF hub id.
- Auto-detects CUDA; falls back to CPU (and warns) if unavailable.
- On CUDA, loads in 4-bit (bitsandbytes) by default: Qwen2.5-VL-3B in plain
  bfloat16 needs ~6GB just for weights, which OOMs on consumer GPUs with
  6-8GB VRAM once the vision encoder + generation activations are added.
  4-bit cuts weight memory to ~2-3GB. Set SEVAALERT_LOAD_IN_4BIT=0 to disable
  (e.g. on a GPU with plenty of headroom, for slightly better accuracy/speed).
"""
import os
from functools import lru_cache

import torch

MODEL_PATH = os.environ.get("SEVAALERT_MODEL_PATH", "Qwen/Qwen2.5-VL-3B-Instruct")
_LOAD_IN_4BIT = os.environ.get("SEVAALERT_LOAD_IN_4BIT", "1") == "1"


@lru_cache(maxsize=1)
def get_model_and_processor():
    """
    Loads (once per process) and returns (model, processor).
    Cached with lru_cache so repeated calls in the same run are free —
    this is what "do not download/reload on every document upload" means
    in practice: call this function each time you need the model, and
    it will only actually do the work the first time.
    """
    from transformers import Qwen2_5_VLForConditionalGeneration, AutoProcessor

    quantization_config = None

    if torch.cuda.is_available():
        device = "cuda"
        dtype = torch.bfloat16
        if _LOAD_IN_4BIT:
            from transformers import BitsAndBytesConfig
            quantization_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_compute_dtype=torch.bfloat16,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_use_double_quant=True,
            )
    else:
        device = "cpu"
        dtype = torch.float32
        print("[sevaalert] WARNING: CUDA not available — running on CPU. "
              "This will be significantly slower.")

    quant_note = " [4-bit]" if quantization_config is not None else ""
    print(f"[sevaalert] Loading {MODEL_PATH} on {device} ({dtype}){quant_note} ...")

    model_kwargs = dict(torch_dtype=dtype, device_map=device)
    if quantization_config is not None:
        model_kwargs["quantization_config"] = quantization_config

    model = Qwen2_5_VLForConditionalGeneration.from_pretrained(MODEL_PATH, **model_kwargs)
    processor = AutoProcessor.from_pretrained(MODEL_PATH)

    print("[sevaalert] Model + processor loaded.")
    return model, processor