"""Lumin Studio — GPU jobs on Modal (owner, 23 NOV 2026: "use GPU, Kaggle or Modal").

enhance_block: Resemble Enhance on one recording block, on a T4. scripts/vo_enhance.py --backend modal sends every
block at once (.map), so a whole narration takes about as long as its longest block.

Cost guardrails (CLAUDE.md §2B): plain @app.function, scaledown_window=2, no region, no non_preemptible. T4 is the
cheapest GPU Modal offers; Resemble Enhance needs ~3 GB of VRAM, so nothing bigger is justified. The model (~1.6 GB)
is baked into the image at build time, so containers never download it per run.

Run: inside the `modal` GitHub workflow (task: enhance), or anywhere with MODAL_TOKEN_ID / MODAL_TOKEN_SECRET set:
    python3 scripts/vo_enhance.py episodes/<id> <id>_b01.mp3 <id>_b02.mp3 --backend modal
"""
from __future__ import annotations

import time
from pathlib import Path

import modal

LOCAL_ROOT = Path(__file__).resolve().parent


def _bake_model() -> None:
    # Downloads the weights (git + git-lfs from huggingface.co/ResembleAI/resemble-enhance) into the image.
    from resemble_enhance.enhancer.download import download
    download()


image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "git", "git-lfs")
    .pip_install("torch==2.1.1", "torchaudio==2.1.1", "torchvision==0.16.1", "setuptools<70", "wheel")
    .pip_install(
        "numpy==1.26.2", "librosa==0.10.1", "omegaconf==2.3.0", "soundfile==0.12.1", "resampy==0.4.2",
        "scipy==1.11.4", "matplotlib==3.8.1", "pandas==2.1.3", "celluloid==0.2.0", "ptflops==0.7.1.2",
        "tabulate==0.8.10", "rich==13.7.0", "tqdm==4.66.1",
    )
    # deepspeed is imported by the package and unused at inference; DS_BUILD_OPS=0 skips its CUDA kernels.
    .run_commands("DS_BUILD_OPS=0 pip install --no-build-isolation deepspeed==0.12.4",
                  "pip install --no-deps resemble-enhance==0.0.1", "git lfs install")
    .run_function(_bake_model)
    .add_local_file(str(LOCAL_ROOT / "scripts" / "vo_enhance.py"), "/root/vo_enhance.py")
)

app = modal.App("lumin-studio-gpu", image=image)


@app.function(gpu="T4", cpu=2.0, memory=8192, timeout=1800, scaledown_window=2)
def enhance_block(data: bytes) -> dict:
    import sys

    sys.path.insert(0, "/root")
    import torch
    from vo_enhance import decode_bytes, enhance_array

    t0 = time.time()
    device = "cuda" if torch.cuda.is_available() else "cpu"
    out = enhance_array(decode_bytes(data), device)
    secs = round(time.time() - t0, 1)
    print(f"[gpu] block of {len(out) / 44100:.1f}s enhanced in {secs}s on {torch.cuda.get_device_name(0) if device == 'cuda' else 'cpu'}")
    return {"pcm": out.tobytes(), "seconds": secs, "device": torch.cuda.get_device_name(0) if device == "cuda" else "cpu"}
