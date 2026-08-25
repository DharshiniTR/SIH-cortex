"""
Step 2 sanity check: does Qwen2.5-VL-3B-Instruct load and generate at all?

No image, no OCR yet — that comes in later steps. This just proves the
model downloads, loads onto the GPU, and produces coherent text for a
plain text-only prompt.

Run with:
    python tests/test_qwen_load.py
"""
import sys
import time
from pathlib import Path

# allow running this file directly (python tests/test_qwen_load.py)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from models.qwen_model import get_model_and_processor


def main():
    t0 = time.time()
    model, processor = get_model_and_processor()
    load_time = time.time() - t0

    messages = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "In one short sentence, what is an income certificate used for in India?"}
            ],
        }
    ]

    text_prompt = processor.apply_chat_template(
        messages, tokenize=False, add_generation_prompt=True
    )
    inputs = processor(text=[text_prompt], return_tensors="pt").to(model.device)

    t1 = time.time()
    generated_ids = model.generate(**inputs, max_new_tokens=64)
    gen_time = time.time() - t1

    # strip the prompt tokens back off, keep only the new tokens
    generated_ids_trimmed = generated_ids[:, inputs.input_ids.shape[1]:]
    output_text = processor.batch_decode(
        generated_ids_trimmed, skip_special_tokens=True
    )[0]

    print("\n--- RESULT ---")
    print(f"Model load time : {load_time:.1f}s")
    print(f"Generation time : {gen_time:.1f}s")
    print(f"Output          : {output_text.strip()}")
    print("--------------\n")


if __name__ == "__main__":
    main()
