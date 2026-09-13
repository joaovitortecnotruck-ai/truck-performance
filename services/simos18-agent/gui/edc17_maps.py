"""
Decodificador das tabelas de multimapa do patch customizado (nao-oficial,
nao e o PwrCls de fabrica da Bosch) encontrado no EDC17CP54 do Amarok V6,
software 1556APFB (box 2H6907311AC).

Estrutura confirmada byte a byte (bate exato com o tamanho de cada bloco
achado no diff ORI vs multimapa):

    offset+0  uint16 LE  xCount
    offset+2  uint16 LE  yCount
    offset+4  xCount x uint16 LE   eixo X (RPM, escala desconhecida)
    ...       yCount x uint16 LE   eixo Y (carga/pedal?, escala desconhecida)
    ...       xCount*yCount x uint16 LE   dados da grade (linha a linha)

NAO sabemos a escala real (Nm, rpm exatos, %) - os valores aqui sao BRUTOS.
So vale pra essa software/box exata; outra revisao do Amarok V6 precisa de
um par ORI/multimapa proprio pra confirmar os offsets de novo (ver
services/simos18-agent/README.md).
"""
import struct

# offset dentro do arquivo (nao do .ols) - confirmados no par
# VAG_7378.ORI vs FQ722000131_Amarok_EDC17CP54_068953_311AC_TESTE.bin
EDC17_TABLE_GROUPS = {
    "1556APFB": {
        "limitador_torque_boost": {
            "label": "Limitador de torque/boost por RPM",
            "base": 0x3D0000,
            "stride": 0xF0,
            "count": 4,
        },
        "mapa_secundario": {
            "label": "Mapa secundário (2D, RPM x carga)",
            "base": 0x3D0BC0,
            "stride": 0x140,
            "count": 3,
        },
        "boost_maximo": {
            "label": "Boost máximo (platô)",
            "base": 0x3D0F80,
            "stride": 0x40,
            "count": 4,
        },
    },
}


def read_2d_map(data: bytes, offset: int) -> dict:
    x_count, y_count = struct.unpack_from("<HH", data, offset)
    pos = offset + 4

    x_axis = struct.unpack_from(f"<{x_count}H", data, pos)
    pos += x_count * 2

    y_axis = struct.unpack_from(f"<{y_count}H", data, pos)
    pos += y_count * 2

    cell_count = x_count * y_count
    flat = struct.unpack_from(f"<{cell_count}H", data, pos)
    grid = [list(flat[r * x_count:(r + 1) * x_count]) for r in range(y_count)]

    return {
        "x_count": x_count,
        "y_count": y_count,
        "x_axis": x_axis,
        "y_axis": y_axis,
        "grid": grid,
        "byte_length": 4 + x_count * 2 + y_count * 2 + cell_count * 2,
    }


def read_all_slots(data: bytes, software_code: str) -> dict:
    """Le todos os grupos de tabela pra essa software, retornando
    {grupo: [tabela_slot1, tabela_slot2, ...]}."""
    groups = EDC17_TABLE_GROUPS.get(software_code)
    if not groups:
        return {}

    result = {}
    for key, spec in groups.items():
        slots = []
        for i in range(spec["count"]):
            offset = spec["base"] + i * spec["stride"]
            try:
                slots.append(read_2d_map(data, offset))
            except struct.error:
                slots.append(None)
        result[key] = {"label": spec["label"], "slots": slots}
    return result


def is_all_zero(table: dict) -> bool:
    if table is None:
        return True
    return not any(any(row) for row in table["grid"])
