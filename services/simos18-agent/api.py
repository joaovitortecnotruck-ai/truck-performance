"""
HTTP API for the Simos18 patch agent - a standalone service, independent of
the Next.js platform. Wraps the same vendored BinToolz engine used by
agent.py (see README.md) behind a small authenticated HTTP surface so any
other system (the website's admin panel, a script, Postman) can call it
over the network instead of shelling out to the CLI.

Run:
    pip install -r requirements.txt
    cp .env.example .env   # fill in PATCHES_DIR and a real API_KEY
    uvicorn api:app --host 0.0.0.0 --port 8787

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

import config
from vendor.btp import BTP
from vendor.patch_functions import DataMode, FunctionType, patchApply, patchCreate
from vendor.return_type import ReturnType
from vendor.simos_bin import SimosBIN

app = FastAPI(title="Simos18 Patch Agent", version="1.0")

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


def _mode(mode: str) -> DataMode:
    try:
        return {"normal": DataMode.NORMAL, "ignore": DataMode.IGNORE, "force": DataMode.FORCE}[mode]
    except KeyError:
        raise HTTPException(status_code=400, detail="mode must be one of: normal, ignore, force")


def _save_upload(upload: UploadFile, dest_dir: Path) -> Path:
    dest = dest_dir / Path(upload.filename or "upload.bin").name
    with dest.open("wb") as f:
        shutil.copyfileobj(upload.file, f)
    return dest


def _resolve_catalog_patch(name: str) -> Path:
    """Look up a patch by filename inside the server's own PATCHES_DIR.
    Only the basename is honored, so a caller cannot escape the directory."""
    if not config.PATCHES_DIR:
        raise HTTPException(status_code=500, detail="Server misconfigured: PATCHES_DIR is not set")

    candidate = Path(config.PATCHES_DIR) / Path(name).name
    if not candidate.is_file():
        raise HTTPException(status_code=404, detail=f"Patch not found in catalog: {name}")
    return candidate


def _resolve_catalog_xdf(relative_path: str) -> Path:
    """Look up an .xdf by its path relative to XDF_DIR (as returned by
    GET /xdf). Resolves symlinks/'..' and rejects anything that escapes
    XDF_DIR."""
    if not config.XDF_DIR:
        raise HTTPException(status_code=500, detail="Server misconfigured: XDF_DIR is not set")

    root = Path(config.XDF_DIR).resolve()
    candidate = (root / relative_path).resolve()
    if root not in candidate.parents and candidate != root:
        raise HTTPException(status_code=400, detail="Invalid path")
    if not candidate.is_file():
        raise HTTPException(status_code=404, detail=f"XDF not found: {relative_path}")
    return candidate


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/patches", dependencies=[])
def list_patches(hw_code: Optional[str] = None, authorization: Optional[str] = Header(default=None)):
    require_api_key(authorization)

    if not config.PATCHES_DIR:
        raise HTTPException(status_code=500, detail="Server misconfigured: PATCHES_DIR is not set")

    directory = Path(config.PATCHES_DIR)
    if not directory.is_dir():
        raise HTTPException(status_code=500, detail=f"PATCHES_DIR does not exist: {directory}")

    matches = sorted(p.name for p in directory.glob("*.btp"))
    if hw_code:
        needle = f"- {hw_code.upper()}.btp".lower()
        matches = [m for m in matches if m.lower().endswith(needle)]

    return {"patches": matches}


@app.get("/xdf")
def list_xdf(hw_code: Optional[str] = None, authorization: Optional[str] = Header(default=None)):
    require_api_key(authorization)

    if not config.XDF_DIR:
        raise HTTPException(status_code=500, detail="Server misconfigured: XDF_DIR is not set")

    root = Path(config.XDF_DIR)
    if not root.is_dir():
        raise HTTPException(status_code=500, detail=f"XDF_DIR does not exist: {root}")

    files = sorted(root.rglob("*.xdf"))
    if hw_code:
        needle = hw_code.lower()
        files = [f for f in files if needle in f.name.lower()]

    return {
        "xdf": [
            {"name": f.name, "path": str(f.relative_to(root)), "folder": str(f.parent.relative_to(root))}
            for f in files
        ]
    }


@app.get("/xdf/download")
def download_xdf(path: str, authorization: Optional[str] = Header(default=None)):
    require_api_key(authorization)
    file_path = _resolve_catalog_xdf(path)
    return FileResponse(path=str(file_path), filename=file_path.name, media_type="application/octet-stream")


@app.post("/identify")
def identify(authorization: Optional[str] = Header(default=None), bin: UploadFile = File(...)):
    require_api_key(authorization)

    with tempfile.TemporaryDirectory() as tmp:
        bin_path = _save_upload(bin, Path(tmp))

        sbin = SimosBIN()
        ret = sbin.load(str(bin_path))
        if ret != ReturnType.OK:
            raise HTTPException(status_code=400, detail=ret.string())

        hw_key, hw_value = sbin.hardwareType()
        if hw_value is None:
            raise HTTPException(status_code=422, detail="Unknown hardware type")

        return {
            "hardware": hw_key,
            "box_code": (sbin.boxCode() or "").strip(),
            "software_code": (sbin.softwareCode() or "").strip(),
            "size": len(sbin.data),
        }


def _collect_patch_paths(tmp: Path, patch_names: list[str], patch_files: list[UploadFile]) -> list[str]:
    paths = [str(_resolve_catalog_patch(name)) for name in patch_names]
    paths += [str(_save_upload(f, tmp)) for f in patch_files]
    if not paths:
        raise HTTPException(status_code=400, detail="Provide at least one of patch_names or patch_files")
    return paths


@app.post("/check")
def check(
    authorization: Optional[str] = Header(default=None),
    bin: UploadFile = File(...),
    patch_names: list[str] = Form(default=[]),
    patch_files: list[UploadFile] = File(default=[]),
):
    require_api_key(authorization)

    with tempfile.TemporaryDirectory() as tmp_str:
        tmp = Path(tmp_str)
        bin_path = _save_upload(bin, tmp)
        patch_paths = _collect_patch_paths(tmp, patch_names, patch_files)

        log_lines: list[str] = []
        patchApply(FunctionType.FUNC_CHECK, str(bin_path), patch_paths, "", DataMode.IGNORE, log_lines.append)

        return {"log": log_lines}


@app.post("/apply")
def apply(
    authorization: Optional[str] = Header(default=None),
    bin: UploadFile = File(...),
    patch_names: list[str] = Form(default=[]),
    patch_files: list[UploadFile] = File(default=[]),
    mode: str = Form(default="ignore"),
    output_name: str = Form(default="patched.bin"),
):
    require_api_key(authorization)
    data_mode = _mode(mode)

    tmp = Path(tempfile.mkdtemp())
    try:
        bin_path = _save_upload(bin, tmp)
        patch_paths = _collect_patch_paths(tmp, patch_names, patch_files)
        output_path = tmp / Path(output_name).name

        log_lines: list[str] = []
        ret = patchApply(FunctionType.FUNC_ADD, str(bin_path), patch_paths, str(output_path), data_mode, log_lines.append)

        if ret != ReturnType.OK or not output_path.is_file():
            shutil.rmtree(tmp, ignore_errors=True)
            return JSONResponse(status_code=422, content={"log": log_lines})

        return FileResponse(
            path=str(output_path),
            filename=output_path.name,
            media_type="application/octet-stream",
            background=BackgroundTask(shutil.rmtree, tmp, ignore_errors=True),
        )
    except Exception:
        shutil.rmtree(tmp, ignore_errors=True)
        raise


@app.post("/create")
def create(
    authorization: Optional[str] = Header(default=None),
    original: UploadFile = File(...),
    modified: UploadFile = File(...),
    mode: str = Form(default="ignore"),
    output_name: str = Form(default="patch.btp"),
):
    require_api_key(authorization)
    data_mode = _mode(mode)

    tmp = Path(tempfile.mkdtemp())
    try:
        original_path = _save_upload(original, tmp)
        modified_path = _save_upload(modified, tmp)
        output_path = tmp / Path(output_name).name

        log_lines: list[str] = []
        ret = patchCreate(str(original_path), str(modified_path), str(output_path), data_mode, log_lines.append)

        if ret != ReturnType.OK or not output_path.is_file():
            shutil.rmtree(tmp, ignore_errors=True)
            return JSONResponse(status_code=422, content={"log": log_lines})

        return FileResponse(
            path=str(output_path),
            filename=output_path.name,
            media_type="application/octet-stream",
            background=BackgroundTask(shutil.rmtree, tmp, ignore_errors=True),
        )
    except Exception:
        shutil.rmtree(tmp, ignore_errors=True)
        raise
