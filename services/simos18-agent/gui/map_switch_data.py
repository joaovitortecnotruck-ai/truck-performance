"""
Endereços e escalas dos parâmetros de "Map Switching" (categoria do XDF),
lidos direto de SC8S50.V1.4.SWG.SP2933.xdf (software SC800S50 / hardware
code S50). Só valem para um bin que já recebeu o SwitchPatch - no bin de
fábrica essa região não tem esses dados.

IMPORTANTE: esses endereços foram confirmados só pra S50. Pra outro
hardware code, os endereços mudam (cada XDF tem o seu) - adicione aqui uma
entrada nova em MAP_SWITCH_TABLES quando confirmar os endereços de outro
código, com o mesmo processo (achar a categoria "Map Switching" e "Map
Slot N" no XDF correspondente).
"""

FILE_BASE_OFFSET = 0x200000  # BASEOFFSET do XDF: endereco_no_bin = endereco_xdf + isso


def _addr(xdf_address: int) -> int:
    return xdf_address + FILE_BASE_OFFSET


MAP_SWITCH_TABLES = {
    "S50": {
        "global": {
            "timeout_ms": {
                "offset": _addr(0x7CB29), "size_bytes": 1,
                "to_value": lambda raw: raw * 10,
                "label": "Timeout da troca", "unit": "ms",
            },
            "min_rpm": {
                "offset": _addr(0x7CB2A), "size_bytes": 2,
                "to_value": lambda raw: raw,
                "label": "RPM mínimo pra aceitar a troca", "unit": "rpm",
            },
            "min_pedal_pct": {
                "offset": _addr(0x7CB2C), "size_bytes": 2,
                "to_value": lambda raw: raw / 10.24,
                "label": "Pedal mínimo pra aceitar a troca", "unit": "%",
            },
            "target_rpm": {
                "offset": _addr(0x7CB2E), "size_bytes": 2,
                "to_value": lambda raw: raw,
                "label": "RPM alvo pós-troca", "unit": "rpm",
            },
        },
        "rpm_limiter_by_slot": {
            1: _addr(0x7CB42),
            2: _addr(0x7CB44),
            3: _addr(0x7CB46),
            4: _addr(0x7CB48),
            # slot 5 nao encontrado nesta versao do XDF - nao inclua sem confirmar
        },
    },
}

# Categoria "RAL" (Rolling Anti-Lag) do mesmo XDF (SC8S50.V1.4.SWG.SP2933).
RAL_TABLES = {
    "S50": {
        "global": {
            "max_accel_ms2": {
                "offset": _addr(0x7CB22), "size_bytes": 1,
                "to_value": lambda raw: raw / 32,
                "label": "Aceleração máxima pra habilitar RAL", "unit": "m/s²",
            },
            "min_oil_temp_c": {
                "offset": _addr(0x7CB24), "size_bytes": 1,
                "to_value": lambda raw: raw - 40,
                "label": "Temperatura mínima do óleo", "unit": "°C",
            },
            "min_coolant_temp_c": {
                "offset": _addr(0x7CB25), "size_bytes": 1,
                "to_value": lambda raw: (raw - 64) / 1.33,
                "label": "Temperatura mínima do arrefecimento", "unit": "°C",
            },
        },
        "enable_by_slot": {
            1: _addr(0x7D81D),
            2: _addr(0x7D81E),
            3: _addr(0x7D81F),
            4: _addr(0x7D820),
        },
    },
}


def read_ral_global(data: bytes, hw_code: str) -> dict:
    table = RAL_TABLES.get(hw_code)
    if not table:
        return {}
    result = {}
    for key, spec in table["global"].items():
        raw = read_le(data, spec["offset"], spec["size_bytes"])
        result[key] = {"value": spec["to_value"](raw), "label": spec["label"], "unit": spec["unit"]}
    return result


def read_ral_enabled(data: bytes, hw_code: str, slot: int):
    table = RAL_TABLES.get(hw_code)
    if not table:
        return None
    offset = table["enable_by_slot"].get(slot)
    if offset is None:
        return None
    return read_le(data, offset, 1) != 0


def read_le(data: bytes, offset: int, size_bytes: int) -> int:
    return int.from_bytes(data[offset:offset + size_bytes], "little")


def read_global_params(data: bytes, hw_code: str) -> dict:
    table = MAP_SWITCH_TABLES.get(hw_code)
    if not table:
        return {}

    result = {}
    for key, spec in table["global"].items():
        raw = read_le(data, spec["offset"], spec["size_bytes"])
        result[key] = {
            "value": spec["to_value"](raw),
            "label": spec["label"],
            "unit": spec["unit"],
        }
    return result


def read_rpm_limiter(data: bytes, hw_code: str, slot: int):
    table = MAP_SWITCH_TABLES.get(hw_code)
    if not table:
        return None
    offset = table["rpm_limiter_by_slot"].get(slot)
    if offset is None:
        return None
    return read_le(data, offset, 2)
