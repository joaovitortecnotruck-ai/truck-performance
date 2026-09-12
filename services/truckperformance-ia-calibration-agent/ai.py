"""
AI analysis layer on top of diffengine.py - takes the mechanical diff (a
list of {offset, original, new} blocks) and asks a Claude model to guess, in
plain language, what kind of calibration data each block might be.

This is explicitly a *hypothesis generator*, not ground truth: without the
XDF/A2L definition for the software code involved, there is no way to know
for certain what a given offset means. Every result carries the source bytes
alongside the model's guess so a human can sanity-check it, and the API/CLI
output always repeats that caveat.
"""
from __future__ import annotations

import json
from dataclasses import dataclass

import config
from diffengine import Block, Patch

try:
    import anthropic
except ImportError:  # pragma: no cover - surfaced as a clear runtime error instead
    anthropic = None


class AIAnalysisError(Exception):
    pass


CAVEAT = (
    "Hipotese gerada por IA a partir apenas dos bytes que mudaram - nao consulta "
    "nenhum XDF/A2L real, pode estar errada. Use como ponto de partida para "
    "investigar no WinOLS/TunerPro, nunca como confirmacao."
)

_SYSTEM_PROMPT = """Voce ajuda calibradores a entender diffs binarios entre dois arquivos de \
ECU/TCU automotivos (mesmo software code, um deles editado para uma feature de tuning). \
Para cada bloco recebido (offset, bytes originais, bytes novos), de uma hipotese curta e \
cautelosa do que aquele bloco pode representar (ex: tabela de limitador de torque, ponto de \
ativacao de EGR/DPF, flag de potencia, trecho de codigo/ASW em vez de calibracao, etc.), \
baseado em padroes como: bytes tudo zero/0xFF, sequencias que parecem floats IEEE754, arrays \
curtos que parecem tabela 1D, ou um unico byte/flag alternando. Seja honesto sobre incerteza - \
prefira "pode ser" a afirmar com certeza. Responda estritamente em JSON: uma lista de objetos \
{"index": int, "hypothesis": str, "confidence": "baixa"|"media"|"alta"}, na mesma ordem dos \
blocos recebidos, um objeto por bloco, nada de texto fora do JSON."""


@dataclass
class BlockAnalysis:
    index: int
    offset: int
    length: int
    hypothesis: str
    confidence: str


def _client() -> "anthropic.Anthropic":
    if anthropic is None:
        raise AIAnalysisError("Pacote 'anthropic' nao instalado - rode `pip install -r requirements.txt`")
    if not config.ANTHROPIC_API_KEY:
        raise AIAnalysisError("ANTHROPIC_API_KEY nao configurada no .env deste servico")
    return anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)


def _describe_block(i: int, block: Block) -> dict:
    return {
        "index": i,
        "offset": block.offset,
        "length": block.length,
        "original_hex": block.original.hex(),
        "new_hex": block.new.hex(),
    }


def analyze_patch(patch: Patch, max_blocks: int = 30) -> list[BlockAnalysis]:
    if not patch.blocks:
        return []

    # Biggest blocks first - they're the most likely to be a meaningful table
    # rather than an incidental single-byte shift, and keeps the prompt small.
    ranked = sorted(range(len(patch.blocks)), key=lambda i: patch.blocks[i].length, reverse=True)
    selected = sorted(ranked[:max_blocks])

    payload = [_describe_block(i, patch.blocks[i]) for i in selected]

    client = _client()
    message = client.messages.create(
        model=config.ANTHROPIC_MODEL,
        max_tokens=4096,
        system=_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": json.dumps(payload)}],
    )

    text = "".join(part.text for part in message.content if getattr(part, "type", None) == "text")
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as e:
        raise AIAnalysisError(f"Modelo nao devolveu JSON valido: {e}\nResposta bruta: {text[:2000]}")

    by_index = {int(item["index"]): item for item in parsed}
    results: list[BlockAnalysis] = []
    for i in selected:
        item = by_index.get(i)
        block = patch.blocks[i]
        if item is None:
            results.append(BlockAnalysis(index=i, offset=block.offset, length=block.length,
                                          hypothesis="(sem resposta do modelo para este bloco)", confidence="baixa"))
        else:
            results.append(BlockAnalysis(
                index=i, offset=block.offset, length=block.length,
                hypothesis=str(item.get("hypothesis", "")).strip(),
                confidence=str(item.get("confidence", "baixa")).strip(),
            ))
    return results
