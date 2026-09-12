import os

from dotenv import load_dotenv

load_dotenv()

API_KEY = os.environ.get("API_KEY", "")
CORS_ORIGINS = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]
MERGE_GAP = int(os.environ.get("MERGE_GAP", "8"))

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-5")
