"""
Endereços e escalas dos parâmetros de "Map Switching" e "RAL" (Rolling
Anti-Lag) do SwitchPatch, por hardware code.

Fonte: os XDFs pequenos e dedicados de cada hardware em
BinToolz-main/definitions/<HW> Switch Patch.29.33.V2.xdf (mesma estrutura
pra S50/A05/LB6/O30/V30 - só o BASEOFFSET e os endereços mudam). Os
endereços de S50 foram cruzados também com o XDF grande
(SC8S50.V1.4.SWG.SP2933.xdf) e batem exatamente.

IMPORTANTE: só valem pra bin que já recebeu o SwitchPatch daquele
hardware - no bin de fábrica essa região não tem esses dados. Pra
adicionar um hardware code novo, repita o processo em
"<HW> Switch Patch.29.33.V2.xdf": ache as tabelas pelo <title> ("Timeout",
"Minimum engagement RPM", "Minimum pedal", "Target RPM", "RPM limiter" x4,
"Enable RAL" x4, "Maximum acceleration allowed to enable RAL", "Minimum
oil/coolant temperature") e pegue o mmedaddress de cada uma.
"""

# endereços crus (relativos ao XDF, antes de somar o BASEOFFSET de cada
# hardware) - rpm_limiter e enable_ral estão na ordem Mapa 1, 2, 3, 4
_HW_RAW = {
    "S50": dict(
        baseoffset=0x200000,
        timeout=0x7CB29, min_rpm=0x7CB2A, min_pedal=0x7CB2C, target_rpm=0x7CB2E,
        rpm_limiter=[0x7CB42, 0x7CB44, 0x7CB46, 0x7CB48],
        enable_ral=[0x7D81D, 0x7D81E, 0x7D81F, 0x7D820],
        max_accel=0x7CB22, min_oil=0x7CB24, min_coolant=0x7CB25,
    ),
    "A05": dict(
        baseoffset=0x220000,
        timeout=0x8FA89, min_rpm=0x8FA8A, min_pedal=0x8FA8C, target_rpm=0x8FA8E,
        rpm_limiter=[0x8FAA2, 0x8FAA4, 0x8FAA6, 0x8FAA8],
        enable_ral=[0x9081D, 0x9081E, 0x9081F, 0x90820],
        max_accel=0x8FA82, min_oil=0x8FA84, min_coolant=0x8FA85,
    ),
    "LB6": dict(
        baseoffset=0x200000,
        timeout=0x7DFA9, min_rpm=0x7DFAA, min_pedal=0x7DFAC, target_rpm=0x7DFAE,
        rpm_limiter=[0x7DFC2, 0x7DFC4, 0x7DFC6, 0x7DFC8],
        enable_ral=[0x7EC93, 0x7EC94, 0x7EC95, 0x7EC96],
        max_accel=0x7DFA2, min_oil=0x7DFA4, min_coolant=0x7DFA5,
    ),
    "O30": dict(
        baseoffset=0x200000,
        timeout=0x7BD09, min_rpm=0x7BD0A, min_pedal=0x7BD0C, target_rpm=0x7BD0E,
        rpm_limiter=[0x7BD22, 0x7BD24, 0x7BD26, 0x7BD28],
        enable_ral=[0x7C9FD, 0x7C9FE, 0x7C9FF, 0x7CA00],
        max_accel=0x7BD02, min_oil=0x7BD04, min_coolant=0x7BD05,
    ),
    "V30": dict(
        baseoffset=0x40000,
        timeout=0xFCB29, min_rpm=0xFCB2A, min_pedal=0xFCB2C, target_rpm=0xFCB2E,
        rpm_limiter=[0xFCB42, 0xFCB44, 0xFCB46, 0xFCB48],
        enable_ral=[0xFD81D, 0xFD81E, 0xFD81F, 0xFD820],
        max_accel=0xFCB22, min_oil=0xFCB24, min_coolant=0xFCB25,
    ),
}

# escala de cada sinal - igual pra todo hardware (é o mesmo tipo de sinal,
# só muda o endereço onde ele mora em cada bin)
_GLOBAL_SCALES = {
    "timeout_ms":     dict(size_bytes=1, to_value=lambda raw: raw * 10, label="Timeout da troca", unit="ms"),
    "min_rpm":        dict(size_bytes=2, to_value=lambda raw: raw, label="RPM mínimo pra aceitar a troca", unit="rpm"),
    "min_pedal_pct":  dict(size_bytes=2, to_value=lambda raw: raw / 10.24, label="Pedal mínimo pra aceitar a troca", unit="%"),
    "target_rpm":     dict(size_bytes=2, to_value=lambda raw: raw, label="RPM alvo pós-troca", unit="rpm"),
}
_RAL_SCALES = {
    "max_accel_ms2":      dict(size_bytes=1, to_value=lambda raw: raw / 32, label="Aceleração máxima pra habilitar RAL", unit="m/s²"),
    "min_oil_temp_c":     dict(size_bytes=1, to_value=lambda raw: raw - 40, label="Temperatura mínima do óleo", unit="°C"),
    "min_coolant_temp_c": dict(size_bytes=1, to_value=lambda raw: (raw - 64) / 1.33, label="Temperatura mínima do arrefecimento", unit="°C"),
}
_GLOBAL_KEY_TO_RAW = {"timeout_ms": "timeout", "min_rpm": "min_rpm", "min_pedal_pct": "min_pedal", "target_rpm": "target_rpm"}
_RAL_KEY_TO_RAW = {"max_accel_ms2": "max_accel", "min_oil_temp_c": "min_oil", "min_coolant_temp_c": "min_coolant"}


def _build_tables():
    map_switch = {}
    ral = {}
    for hw, raw in _HW_RAW.items():
        base = raw["baseoffset"]

        map_switch[hw] = {
            "global": {
                key: {**spec, "offset": raw[_GLOBAL_KEY_TO_RAW[key]] + base}
                for key, spec in _GLOBAL_SCALES.items()
            },
            "rpm_limiter_by_slot": {i + 1: addr + base for i, addr in enumerate(raw["rpm_limiter"])},
        }

        ral[hw] = {
            "global": {
                key: {**spec, "offset": raw[_RAL_KEY_TO_RAW[key]] + base}
                for key, spec in _RAL_SCALES.items()
            },
            "enable_by_slot": {i + 1: addr + base for i, addr in enumerate(raw["enable_ral"])},
        }

    return map_switch, ral


MAP_SWITCH_TABLES, RAL_TABLES = _build_tables()


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
