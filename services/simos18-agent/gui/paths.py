"""
Unico lugar onde a pasta do projeto neste PC fica fixada. app.py, state.py
e audit.py importam PROJECT_DIR daqui em vez de cada um ter seu proprio
caminho absoluto - se essa pasta mudar de lugar de novo (ja aconteceu:
OneDrive re-apontou o Desktop e a copia antiga ficou orfa), so precisa
trocar em UM lugar.
"""
from pathlib import Path

PROJECT_DIR = Path(r"C:\Users\Avell\Desktop\truck-performance\services\simos18-agent")
