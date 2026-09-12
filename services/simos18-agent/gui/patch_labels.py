"""
Nomes amigáveis pros arquivos .btp, pra não confundir na hora de escolher.
O nome de arquivo original nunca muda (é o que vai pra API) - isso é só o
texto mostrado pra pessoa que está usando o programa.
"""
import re

# (padrão do começo do nome do arquivo, nome simples, aviso curto)
_RULES = [
    (re.compile(r"^SL PATCH", re.I),
     "Multimapa (troca de mapa)",
     None),
    (re.compile(r"^SL CBRICK", re.I),
     "Proteção anti-brick",
     "recomendado aplicar sempre"),
    (re.compile(r"^SL HSL", re.I),
     "Log avançado (mais parâmetros)",
     None),
    (re.compile(r"^SWG", re.I),
     "Wastegate simples",
     "só se a turbina não for mais a original"),
    (re.compile(r"^Immo", re.I),
     "Bypass do imobilizador",
     "só ao trocar a ECU do carro"),
    (re.compile(r"^CAT patch", re.I),
     "Desativa monitor de catalisador",
     "mexe em sistema de emissão"),
    (re.compile(r"^FREE SAP", re.I),
     "Libera bomba de ar secundário",
     "mexe em sistema de emissão"),
]


def friendly_label(filename: str) -> str:
    """'SL PATCH.29.33 - S50.btp' -> 'Multimapa (troca de mapa)  [SL PATCH.29.33 - S50.btp]'"""
    for pattern, simple_name, warning in _RULES:
        if pattern.match(filename):
            suffix = f"  ⚠ {warning}" if warning else ""
            return f"{simple_name}{suffix}   —   {filename}"

    return filename
