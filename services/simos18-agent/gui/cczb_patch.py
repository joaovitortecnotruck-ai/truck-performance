"""Multimapa para VW/Audi CCZB (Bosch MED17.5, motor EA888 2.0 TSI) -
descoberto via diff entre ORI_FULL.MPC e os dois arquivos STEP1/STEP2
("MULTIMAP Full read and write only") fornecidos pelo usuario, mais uma
segunda leitura (parcial, via OBD) que confirmou que o patch e universal
(mesmos offsets, mesmos bytes originais esperados, mesmo conteudo novo,
independente de qual arquivo de origem).

Ao contrario do B58 (um unico blob contiguo), aqui o patch e MUITO
parecido com o SwitchPatch do Simos18: centenas de blocos pequenos
espalhados pela area de codigo (ASW). STG1 e STG2 sao dois patches quase
identicos (698 vs 691 blocos, com so ~12 bytes de diferenca de conteudo
entre os dois em pontos especificos) - tratados aqui como dois produtos
separados (Stage 1 / Stage 2), nao como slots trocaveis em tempo real.

IMPORTANTE: validado só por diff dos arquivos fornecidos pelo usuario
(uma leitura completa + uma parcial), nunca testado em ECU real. Trate
como experimental ate confirmar numa bancada."""
import struct
import sys
from pathlib import Path

STAGES = ("stg1", "stg2")
MODES = ("full", "partial")


def _data_dir() -> Path:
    base = getattr(sys, "_MEIPASS", None)
    if base:
        return Path(base) / "data"
    return Path(__file__).parent / "data"


# "full" = gravação completa de bancada (691/698 blocos, valida contra o
# STEP1/STEP2_FULL_MULTIMAP reais). "partial" = gravação parcial via OBD -
# so existe pra stg1, porque so temos um exemplo real (STAGE1.MOD) validado
# nesse modo; nao ha exemplo real de escrita parcial pra stg2, entao esse
# modo nao esta disponivel pra stg2 (ver check_original).
_PATCH_FILES = {
    ("stg1", "full"): _data_dir() / "cczb_med175_stg1_full.bin",
    ("stg1", "partial"): _data_dir() / "cczb_med175_stg1_partial.bin",
    ("stg2", "full"): _data_dir() / "cczb_med175_stg2_full.bin",
}


def _load_blocks(stage: str, mode: str):
    """Le o formato proprio gravado por extract_cczb2.py: uint32 count,
    depois por bloco uint32 offset + uint32 length + bytes originais
    esperados + bytes novos."""
    path = _PATCH_FILES[(stage, mode)]
    data = path.read_bytes()
    (count,) = struct.unpack_from("<I", data, 0)
    pos = 4
    blocks = []
    for _ in range(count):
        offset, length = struct.unpack_from("<II", data, pos)
        pos += 8
        old = data[pos:pos + length]
        pos += length
        new = data[pos:pos + length]
        pos += length
        blocks.append((offset, old, new))
    return blocks


def check_original(data: bytes, stage: str, mode: str) -> tuple[bool, str]:
    """Confere se TODOS os bytes que o patch vai sobrescrever batem com o
    esperado - se um so bloco nao bater, recusa (mesma logica de
    seguranca do check() do Simos18/BinToolz: nao grava em cima de algo
    que ja foi modificado ou que e de um software diferente)."""
    if stage not in STAGES:
        return False, f"stage desconhecido: {stage!r} (esperado: {STAGES})"
    if mode not in MODES:
        return False, f"modo desconhecido: {mode!r} (esperado: {MODES})"
    if (stage, mode) not in _PATCH_FILES:
        return False, (f"{stage}/{mode} nao tem patch validado ainda - so temos exemplo real "
                        f"de escrita parcial (OBD) pra stg1. Pra {stage} use modo 'full' "
                        "(gravação completa de bancada).")
    blocks = _load_blocks(stage, mode)
    bad = 0
    first_bad_offset = None
    for offset, old, _new in blocks:
        if data[offset:offset + len(old)] != old:
            bad += 1
            if first_bad_offset is None:
                first_bad_offset = offset
    if bad:
        return False, (f"{bad} de {len(blocks)} blocos nao batem com o esperado "
                        f"(primeiro em 0x{first_bad_offset:X}) - arquivo incompativel "
                        "ou ja modificado")
    return True, f"todos os {len(blocks)} blocos conferem - seguro para gravar"


def apply(data: bytes, stage: str, mode: str) -> bytes:
    ok, detail = check_original(data, stage, mode)
    if not ok:
        raise ValueError(detail)
    blocks = _load_blocks(stage, mode)
    out = bytearray(data)
    for offset, _old, new in blocks:
        out[offset:offset + len(new)] = new
    return bytes(out)
