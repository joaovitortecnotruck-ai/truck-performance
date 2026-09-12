"""Log de auditoria local: um registro por linha (JSONL) de cada aplicacao
de patch - pra poder responder depois "o que eu apliquei nesse carro e
quando". Fica em logs/audit.jsonl, ao lado do .env."""
import json
from datetime import datetime
from pathlib import Path

AUDIT_PATH = Path(r"C:\Users\Avell\OneDrive\Desktop\truck-performance\services\simos18-agent\logs\audit.jsonl")


def log_apply(*, input_bin, output_bin, hardware, software_code, patches, mode, success, detail=""):
    entry = {
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "input_bin": input_bin,
        "output_bin": output_bin,
        "hardware": hardware,
        "software_code": software_code,
        "patches": patches,
        "mode": mode,
        "success": success,
        "detail": detail,
    }
    try:
        AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(AUDIT_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except Exception:
        pass  # log é conveniência, nunca deve derrubar a aplicação do patch


def read_log(limit: int = 200) -> list:
    if not AUDIT_PATH.is_file():
        return []
    try:
        lines = AUDIT_PATH.read_text(encoding="utf-8").splitlines()
    except Exception:
        return []
    entries = []
    for line in lines[-limit:]:
        try:
            entries.append(json.loads(line))
        except Exception:
            continue
    return entries
