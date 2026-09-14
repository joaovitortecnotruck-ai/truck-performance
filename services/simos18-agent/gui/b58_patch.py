"""Multimapa para BMW B58 (Bosch MEVD17.2.x) - descoberto via diff entre
5 pares original/MapSwitchBase fornecidos pelo usuario (2 familias de
calibracao: prefixo de software code 3076xxxxxx e 3081xxxxxx).

Ao contrario do Simos18 (onde o SwitchPatch mexe em varios blocos
espalhados pelo ASW), aqui o "MapSwitchBase" e um unico blob contiguo de
41472 bytes gravado numa regiao que no arquivo de fabrica vem inteira
preenchida com o byte de padding 0xC3 (nao usada) - confirmado em todos
os 5 pares reais, sem nenhuma diferenca fora dessa regiao. As duas
familias so diferem em ~106 bytes de constantes de calibracao dentro do
blob (limites/tabela especifica da tune); o resto do codigo injetado e
identico.

IMPORTANTE: diferente do Simos18/EDC17 (que passaram por teste real de
aplicacao com o motor do BinToolz), este mecanismo foi validado só por
diff dos 5 pares fornecidos - nunca testado em ECU real. Trate como
experimental ate confirmar numa bancada."""
import sys
from pathlib import Path

REGION_START = 0x710000
REGION_END = 0x71A200  # exclusivo
REGION_LENGTH = REGION_END - REGION_START
PAD_BYTE = 0xC3


def _data_dir() -> Path:
    """Igual ao resource_path() do app.py: os blobs ficam achatados dentro
    de _MEIPASS/data quando empacotado com PyInstaller (--add-data), ou em
    gui/data em desenvolvimento."""
    base = getattr(sys, "_MEIPASS", None)
    if base:
        return Path(base) / "data"
    return Path(__file__).parent / "data"


FAMILIES = {
    "3076": _data_dir() / "b58_switch_3076.bin",
    "3081": _data_dir() / "b58_switch_3081.bin",
}

# codigos de software reais conhecidos por familia (so pra referencia/log -
# a identificacao automatica usa o prefixo do software code informado pelo
# usuario, nao um scan do binario, porque o software code do B58 nao fica
# gravado como ASCII literal no .bin, ao contrario do Simos18)
KNOWN_SOFTWARE_CODES = {
    "3076": ["00003076501103", "00003076501D02", "000030765A3C06"],
    "3081": ["00003081501102", "00003081501D04"],
}


def family_for_software_code(software_code: str) -> str | None:
    software_code = software_code.strip()
    for prefix in FAMILIES:
        if software_code.startswith(prefix):
            return prefix
    return None


def check_original(data: bytes) -> tuple[bool, str]:
    """Confere se a regiao de destino esta intacta (so padding 0xC3) -
    seguranca antes de gravar, igual ao check() do Simos18."""
    if len(data) < REGION_END:
        return False, f"arquivo menor que o esperado ({len(data)} bytes, precisa de pelo menos {REGION_END})"
    region = data[REGION_START:REGION_END]
    non_pad = sum(1 for b in region if b != PAD_BYTE)
    if non_pad:
        return False, (f"regiao 0x{REGION_START:X}-0x{REGION_END:X} nao esta vazia "
                        f"({non_pad} bytes diferentes de 0x{PAD_BYTE:02X}) - "
                        "este arquivo ja tem algo gravado ali ou nao e compativel")
    return True, "regiao de destino confirmada vazia (0xC3) - seguro para gravar"


def apply(data: bytes, family: str) -> bytes:
    if family not in FAMILIES:
        raise ValueError(f"familia desconhecida: {family!r} (esperado: {list(FAMILIES)})")
    ok, detail = check_original(data)
    if not ok:
        raise ValueError(detail)
    blob_path = FAMILIES[family]
    blob = blob_path.read_bytes()
    if len(blob) != REGION_LENGTH:
        raise RuntimeError(f"blob da familia {family} tem tamanho errado: {len(blob)} (esperado {REGION_LENGTH})")
    out = bytearray(data)
    out[REGION_START:REGION_END] = blob
    return bytes(out)
