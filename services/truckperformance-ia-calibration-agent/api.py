"""
HTTP API for the TruckPerformance IA Calibration Agent - a standalone
service, independent of the Next.js platform and of ../simos18-agent. Wraps
diffengine.py (generic byte-level diff/patch) and ai.py (optional AI
hypothesis layer) behind a small authenticated HTTP surface.

Run:
    pip install -r requirements.txt
    cp .env.example .env   # fill in API_KEY, and ANTHROPIC_API_KEY if you want /analyze
    uvicorn api:app --host 0.0.0.0 --port 8788

Every endpoint except /health requires:
    Authorization: Bearer <API_KEY>
"""
import shutil
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from starlette.background import BackgroundTask

import ai
import config
from diffengine import DiffEngineError, apply_patch, check_patch, diff_bins, load_patch, revert_patch, save_patch

app = FastAPI(title="TruckPerformance IA Calibration Agent", version="1.0")

if config.CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.CORS_ORIGINS,
        allow_methods=["*"],
        allow_headers=["*"],
    )


def require_api_key(authorization: Optional[str] = Header(default=None)) -> None:
    if not config.API_KEY:
        raise HTTPException(status_code=500, detail="Server misconfigured: API_KEY is not set")
    expected = f"Bearer {config.API_KEY}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")


def _save_upload(upload: UploadFile, dest_dir: Path) -> Path:
    dest = dest_dir / Path(upload.filename or "upload.bin").name
    with dest.open("wb") as f:
        shutil.copyfileobj(upload.file, f)
    return dest


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/diff")
def diff(
    authorization: Optional[str] = Header(default=None),
    original: UploadFile = File(...),
    modified: UploadFile = File(...),
    merge_gap: int = Form(default=8),
    notes: str = Form(default=""),
    output_name: str = Form(default="patch.tppatch"),
):
    require_api_key(authorization)

    tmp = Path(tempfile.mkdtemp())
    try:
        original_bytes = _save_upload(original, tmp).read_bytes()
        modified_bytes = _save_upload(modified, tmp).read_bytes()

        try:
            patch = diff_bins(original_bytes, modified_bytes, merge_gap=merge_gap, notes=notes)
        except DiffEngineError as e:
            raise HTTPException(status_code=422, detail=str(e))

        output_path = tmp / Path(output_name).name
        save_patch(patch, output_path)

        return FileResponse(
            path=str(output_path),
            filename=output_path.name,
            media_type="application/json",
            background=BackgroundTask(shutil.rmtree, tmp, ignore_errors=True),
        )
    except Exception:
        shutil.rmtree(tmp, ignore_errors=True)
        raise


@app.post("/check")
def check(
    authorization: Optional[str] = Header(default=None),
    bin: UploadFile = File(...),
    patch: UploadFile = File(...),
):
    require_api_key(authorization)

    with tempfile.TemporaryDirectory() as tmp_str:
        tmp = Path(tmp_str)
        bin_path = _save_upload(bin, tmp)
        patch_path = _save_upload(patch, tmp)

        parsed = load_patch(patch_path)
        problems = check_patch(bin_path.read_bytes(), parsed)

        return {"ok": not problems, "problems": problems, "block_count": len(parsed.blocks)}


@app.post("/apply")
def apply(
    authorization: Optional[str] = Header(default=None),
    bin: UploadFile = File(...),
    patch: UploadFile = File(...),
    force: bool = Form(default=False),
    output_name: str = Form(default="patched.bin"),
):
    require_api_key(authorization)

    tmp = Path(tempfile.mkdtemp())
    try:
        bin_path = _save_upload(bin, tmp)
        patch_path = _save_upload(patch, tmp)
        parsed = load_patch(patch_path)

        try:
            result = apply_patch(bin_path.read_bytes(), parsed, force=force)
        except DiffEngineError as e:
            shutil.rmtree(tmp, ignore_errors=True)
            return JSONResponse(status_code=422, content={"error": str(e)})

        output_path = tmp / Path(output_name).name
        output_path.write_bytes(result)

        return FileResponse(
            path=str(output_path),
            filename=output_path.name,
            media_type="application/octet-stream",
            background=BackgroundTask(shutil.rmtree, tmp, ignore_errors=True),
        )
    except Exception:
        shutil.rmtree(tmp, ignore_errors=True)
        raise


@app.post("/revert")
def revert(
    authorization: Optional[str] = Header(default=None),
    bin: UploadFile = File(...),
    patch: UploadFile = File(...),
    force: bool = Form(default=False),
    output_name: str = Form(default="reverted.bin"),
):
    require_api_key(authorization)

    tmp = Path(tempfile.mkdtemp())
    try:
        bin_path = _save_upload(bin, tmp)
        patch_path = _save_upload(patch, tmp)
        parsed = load_patch(patch_path)

        try:
            result = revert_patch(bin_path.read_bytes(), parsed, force=force)
        except DiffEngineError as e:
            shutil.rmtree(tmp, ignore_errors=True)
            return JSONResponse(status_code=422, content={"error": str(e)})

        output_path = tmp / Path(output_name).name
        output_path.write_bytes(result)

        return FileResponse(
            path=str(output_path),
            filename=output_path.name,
            media_type="application/octet-stream",
            background=BackgroundTask(shutil.rmtree, tmp, ignore_errors=True),
        )
    except Exception:
        shutil.rmtree(tmp, ignore_errors=True)
        raise


@app.post("/analyze")
def analyze(
    authorization: Optional[str] = Header(default=None),
    patch: UploadFile = File(...),
    max_blocks: int = Form(default=30),
):
    require_api_key(authorization)

    with tempfile.TemporaryDirectory() as tmp_str:
        tmp = Path(tmp_str)
        patch_path = _save_upload(patch, tmp)
        parsed = load_patch(patch_path)

        try:
            results = ai.analyze_patch(parsed, max_blocks=max_blocks)
        except ai.AIAnalysisError as e:
            raise HTTPException(status_code=422, detail=str(e))

        return {
            "caveat": ai.CAVEAT,
            "blocks": [
                {"index": r.index, "offset": r.offset, "length": r.length,
                 "hypothesis": r.hypothesis, "confidence": r.confidence}
                for r in results
            ],
        }
