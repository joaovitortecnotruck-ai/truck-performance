"""Pequeno estado local da janela (ultima pasta usada, modo preferido) -
nao e configuracao do servico, so conveniencia entre uma abertura e outra
do programa. Fica ao lado do .env, fora da pasta temporaria do PyInstaller
(que e apagada a cada execucao)."""
import json
from pathlib import Path

STATE_PATH = Path(r"C:\Users\Avell\OneDrive\Desktop\truck-performance\services\simos18-agent\gui_state.json")


def load_state() -> dict:
    if not STATE_PATH.is_file():
        return {}
    try:
        return json.loads(STATE_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}


def save_state(data: dict) -> None:
    try:
        STATE_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:
        pass
