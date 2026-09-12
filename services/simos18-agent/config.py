import os

from dotenv import load_dotenv

load_dotenv()

PATCHES_DIR = os.environ.get("PATCHES_DIR", "")
XDF_DIR = os.environ.get("XDF_DIR", "")
API_KEY = os.environ.get("API_KEY", "")
CORS_ORIGINS = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]
