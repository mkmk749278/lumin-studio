"""Lumin Studio — Modal serverless render pipeline (Modal >= 1.6).

Bundle once -> fan out N parallel CPU containers over non-overlapping frame ranges (video only) ->
one lossless concat + a single mastered WAV muxed at the very end (no per-chunk AAC, so no boundary pops).

Rules this file enforces (CLAUDE.md §2B):
  * current SDK only: Image.add_local_dir(..., ignore=[...]) / add_local_file; never modal.Mount / copy_local_dir
  * every render function: scaledown_window=2 (containers die as soon as their chunk is done)
  * plain @app.function — no Sandboxes, no non_preemptible, no region pinning (all multiply cost)
  * CPU only (cpu=4.0, memory=8192) for chunks; GPU reserved for optional Blender plates, not here

Usage (headless, from a phone-driven session):
    modal run modal_render.py --composition LuminDemo --workers 2              # 5 s smoke test, 1080p
    modal run modal_render.py --composition FuturesLabLong --scale 0.5 --workers 30
    modal run modal_render.py --composition FuturesLabLong --workers 30 --audio episodes/ep01/audio/master.wav
    modal volume get lumin-render-vol renders/<job>/final.mp4 .               # fetch the result

Cost model printed at the end uses Modal's published per-second CPU and memory rates (constants below);
re-check them against modal.com/pricing before trusting the estimate on a big render.
"""
from __future__ import annotations

import json
import math
import os
import subprocess
import time
import uuid
from pathlib import Path

import modal

APP_NAME = "lumin-studio-render"
VOLUME_NAME = "lumin-render-vol"
VOL = "/vol"
REPO_IN_IMAGE = "/repo"
CHUNK_CPU = 4.0
CHUNK_MEM_MB = 8192

# Modal list prices (USD) used ONLY for the printed estimate. Per physical core-second (1 core = 2 vCPU in
# Modal's billing) and per GiB-second. Verify at modal.com/pricing.
PRICE_CPU_CORE_SEC = 0.0000131
PRICE_MEM_GIB_SEC = 0.00000222

LOCAL_ROOT = Path(__file__).resolve().parent

# Image: Debian + Node 20 + FFmpeg + the shared libs Remotion's headless Chrome needs. Dependencies are
# installed from package.json/package-lock.json in a layer BEFORE the source is added, so a code change
# reuses the cached node_modules layer instead of reinstalling.
image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install(
        "curl", "ca-certificates", "ffmpeg", "fonts-noto-color-emoji",
        # Chrome Headless Shell runtime deps
        "libnss3", "libdbus-1-3", "libatk1.0-0", "libatk-bridge2.0-0", "libcups2", "libdrm2",
        "libxkbcommon0", "libxcomposite1", "libxdamage1", "libxfixes3", "libxrandr2", "libgbm1",
        "libasound2", "libpango-1.0-0", "libcairo2",
    )
    .run_commands(
        "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -",
        "apt-get install -y nodejs",
        "node --version && npm --version && ffmpeg -version | head -1",
    )
    .add_local_file(str(LOCAL_ROOT / "package.json"), f"{REPO_IN_IMAGE}/package.json", copy=True)
    .add_local_file(str(LOCAL_ROOT / "package-lock.json"), f"{REPO_IN_IMAGE}/package-lock.json", copy=True)
    .run_commands(
        f"cd {REPO_IN_IMAGE} && npm ci --no-audit --no-fund",
        # Pre-download Remotion's pinned Chrome Headless Shell into the image (cached layer).
        f"cd {REPO_IN_IMAGE} && npx remotion browser ensure",
    )
    .add_local_dir(
        str(LOCAL_ROOT),
        REPO_IN_IMAGE,
        ignore=["node_modules", "build", "out", "renders", ".git", "**/*.mp4", "**/*.wav", "**/*.mov",
                "**/__pycache__", ".env", "episodes/*/assets", "data/raw"],
    )
)

app = modal.App(APP_NAME, image=image)
volume = modal.Volume.from_name(VOLUME_NAME, create_if_missing=True)


def _log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def _run(cmd: list[str], cwd: str | None = None) -> str:
    _log("$ " + " ".join(cmd))
    p = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if p.returncode != 0:
        raise RuntimeError(f"command failed ({p.returncode}): {' '.join(cmd)}\n{p.stdout[-3000:]}\n{p.stderr[-3000:]}")
    return p.stdout


@app.function(cpu=CHUNK_CPU, memory=CHUNK_MEM_MB, timeout=1800, scaledown_window=2, volumes={VOL: volume})
def prepare_bundle(job: str, composition: str) -> dict:
    """One container: bundle the Remotion project onto the shared volume and read the composition metadata."""
    t0 = time.time()
    out = f"{VOL}/renders/{job}/bundle"
    _run(["npx", "remotion", "bundle", "src/index.ts", "--out-dir", out], cwd=REPO_IN_IMAGE)
    meta = json.loads(_run(["node", "scripts/composition_meta.mjs", out, composition], cwd=REPO_IN_IMAGE).strip().splitlines()[-1])
    volume.commit()
    meta["bundle_seconds"] = round(time.time() - t0, 1)
    _log(f"bundle ready: {meta}")
    return meta


@app.function(cpu=CHUNK_CPU, memory=CHUNK_MEM_MB, timeout=3600, scaledown_window=2, volumes={VOL: volume})
def render_chunk(job: str, composition: str, index: int, start: int, end: int, scale: float) -> dict:
    """Render frames [start, end] (inclusive) video-only to an H.264 chunk on the volume."""
    t0 = time.time()
    volume.reload()
    bundle = f"{VOL}/renders/{job}/bundle"
    out = f"{VOL}/renders/{job}/chunks/{index:04d}.mp4"
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    _run([
        "npx", "remotion", "render", bundle, composition, out,
        f"--frames={start}-{end}", f"--scale={scale}", "--muted", "--codec=h264", "--crf=16",
        "--pixel-format=yuv420p", "--concurrency=4", "--gl=swangle", "--log=error",
    ], cwd=REPO_IN_IMAGE)
    volume.commit()
    secs = time.time() - t0
    _log(f"chunk {index} frames {start}-{end} done in {secs:.1f}s")
    return {"index": index, "start": start, "end": end, "seconds": round(secs, 1), "path": out}


@app.function(cpu=2.0, memory=4096, timeout=1800, scaledown_window=2, volumes={VOL: volume})
def stitch_master(job: str, n_chunks: int, audio_path: str | None) -> dict:
    """Lossless concat of the chunks; if a mastered WAV is given, mux it ONCE here (AAC 320k)."""
    t0 = time.time()
    volume.reload()
    base = Path(f"{VOL}/renders/{job}")
    chunks = [base / "chunks" / f"{i:04d}.mp4" for i in range(n_chunks)]
    missing = [str(c) for c in chunks if not c.exists()]
    if missing:
        raise RuntimeError(f"missing chunks: {missing}")
    lst = base / "concat.txt"
    lst.write_text("".join(f"file '{c}'\n" for c in chunks))
    video = base / "video.mp4"
    _run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(lst),
          "-c", "copy", "-movflags", "+faststart", str(video)])
    final = base / "final.mp4"
    if audio_path:
        _run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(video), "-i", audio_path,
              "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "320k", "-shortest",
              "-movflags", "+faststart", str(final)])
    else:
        video.rename(final)
    probe = json.loads(_run(["ffprobe", "-v", "error", "-show_entries",
                             "stream=codec_type,codec_name,width,height,nb_frames,r_frame_rate:format=duration,size",
                             "-of", "json", str(final)]))
    volume.commit()
    _log(f"master ready: {final}")
    return {"path": str(final).replace(f"{VOL}/", ""), "probe": probe, "seconds": round(time.time() - t0, 1)}


def _ranges(frames: int, workers: int) -> list[tuple[int, int]]:
    """Non-overlapping inclusive ranges covering 0..frames-1 exactly once."""
    workers = max(1, min(workers, frames))
    size = math.ceil(frames / workers)
    return [(s, min(frames, s + size) - 1) for s in range(0, frames, size)]


@app.local_entrypoint()
def main(composition: str = "LuminDemo", workers: int = 30, scale: float = 1.0, audio: str = "",
         job: str = "") -> None:
    job = job or f"{composition.lower()}-{time.strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:6]}"
    wall0 = time.time()
    audio_remote = None
    if audio:
        # Upload the mastered WAV to the volume once; every heavy byte stays off GitHub.
        audio_remote = f"{VOL}/renders/{job}/master.wav"
        with volume.batch_upload() as b:
            b.put_file(audio, f"/renders/{job}/master.wav")
        _log(f"uploaded {audio} -> {VOLUME_NAME}:{audio_remote}")

    meta = prepare_bundle.remote(job, composition)
    ranges = _ranges(meta["frames"], workers)
    _log(f"{composition}: {meta['frames']} frames @ {meta['fps']} fps, {meta['width']}x{meta['height']} x{scale} "
         f"-> {len(ranges)} parallel chunk(s)")
    results = list(render_chunk.starmap([(job, composition, i, s, e, scale) for i, (s, e) in enumerate(ranges)]))
    master = stitch_master.remote(job, len(ranges), audio_remote)
    wall = time.time() - wall0

    # Cost estimate: container-seconds x (cores + GiB). Chunks: 4 vCPU = 2 cores, 8 GiB.
    chunk_secs = sum(r["seconds"] for r in results) + meta["bundle_seconds"]
    cores = CHUNK_CPU / 2
    gib = CHUNK_MEM_MB / 1024
    cost = chunk_secs * (cores * PRICE_CPU_CORE_SEC + gib * PRICE_MEM_GIB_SEC)
    cost += master["seconds"] * (1.0 * PRICE_CPU_CORE_SEC + 4 * PRICE_MEM_GIB_SEC)

    summary = {
        "job": job, "composition": composition, "wall_seconds": round(wall, 1),
        "bundle_seconds": meta["bundle_seconds"], "chunk_seconds": [r["seconds"] for r in results],
        "stitch_seconds": master["seconds"], "billed_compute_seconds_est": round(chunk_secs + master["seconds"], 1),
        "estimated_cost_usd": round(cost, 4), "output": f"{VOLUME_NAME}:/{master['path']}", "probe": master["probe"],
    }
    print(json.dumps(summary, indent=2))
    print(f"\nFetch:  modal volume get {VOLUME_NAME} /{master['path']} .")
