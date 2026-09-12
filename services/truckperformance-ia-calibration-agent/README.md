# TruckPerformance IA Calibration Agent

Diff & patch binário genérico entre dois arquivos do **mesmo software** (ex.:
um `.bin` de fábrica e o mesmo `.bin` editado no WinOLS/TunerPro para ligar
uma feature de tuning), mais uma camada opcional de IA que dá palpites sobre
o que cada bloco alterado pode representar.

Esta é a Fase 3 prevista no [README da raiz](../../README.md) do projeto
("agente de IA de calibração"). Diferente do
[`simos18-agent`](../simos18-agent/README.md), este serviço **não conhece
nada de ECU/hardware específico** (Simos18, EDC17, box code, software code
etc.) — ele só compara bytes. Isso o torna mais genérico (serve para
qualquer par de arquivos do mesmo tamanho/software), mas também significa
que ele não valida hardware/software code como o `simos18-agent` faz.

## Como funciona

1. **`diff`** — compara `original.bin` e `modified.bin` byte a byte (os dois
   precisam ter o mesmo tamanho) e gera um `.tppatch` (JSON legível): uma
   lista de blocos `{offset, bytes originais, bytes novos}`. Diferenças
   próximas (até `MERGE_GAP` bytes, padrão 8) são agrupadas num bloco só,
   pra não virar uma lista de centenas de blocos de 1 byte.
2. **`check`** — confere se um bin bate com os bytes "originais" esperados
   pelo patch, sem gravar nada.
3. **`apply`** — grava os bytes "novos" do patch num bin (depois de um
   `check` implícito, a menos que use `--force`).
4. **`revert`** — o inverso do `apply`: grava os bytes "originais" de volta,
   pra desfazer um patch já aplicado.
5. **`analyze`** *(opcional, precisa de `ANTHROPIC_API_KEY`)* — manda os
   blocos do patch pra um modelo Claude e pede uma hipótese em texto do que
   cada um pode ser (tabela de limitador de torque, flag de EGR/DPF, trecho
   de código em vez de calibração, etc.).

   **Isso é só uma hipótese, não uma verdade** — sem o XDF/A2L real daquele
   software code não tem como saber com certeza o que um offset significa.
   Toda resposta (CLI e API) repete esse aviso. Use como ponto de partida
   pra investigar no WinOLS/TunerPro, nunca como confirmação.

## Uso — CLI

```bash
# 1. gerar o patch a partir de um par original/modificado do mesmo software
python agent.py diff original.bin modified.bin feature.tppatch --notes "libera potencia stage 1"

# 2. conferir se outro bin do mesmo software está pronto para receber o patch
python agent.py check outro_cliente.bin feature.tppatch

# 3. aplicar de verdade
python agent.py apply outro_cliente.bin feature.tppatch outro_cliente_patched.bin

# 4. desfazer, se precisar
python agent.py revert outro_cliente_patched.bin feature.tppatch outro_cliente.bin

# 5. (opcional) pedir uma leitura de IA sobre o que os blocos podem ser
python agent.py analyze feature.tppatch
```

## Rodando como serviço (API HTTP)

Serviço separado do Next.js, igual ao `simos18-agent` — mas numa porta
diferente pra rodar os dois ao mesmo tempo na mesma máquina.

```bash
pip install -r requirements.txt
copy .env.example .env
# edite o .env: API_KEY (obrigatório) e ANTHROPIC_API_KEY (só se for usar /analyze)
python -m uvicorn api:app --host 0.0.0.0 --port 8788
```

Toda rota (exceto `/health`) exige o header `Authorization: Bearer <API_KEY>`.

| Rota | O que faz |
|---|---|
| `GET /health` | ping, sem autenticação |
| `POST /diff` | recebe `original` + `modified`, devolve o `.tppatch` gerado |
| `POST /check` | recebe `bin` + `patch`, devolve `{ok, problems[], block_count}` |
| `POST /apply` | recebe `bin` + `patch` (+ `force` opcional), devolve o `.bin` resultante |
| `POST /revert` | recebe `bin` + `patch` (+ `force` opcional), devolve o `.bin` revertido |
| `POST /analyze` | recebe `patch` (+ `max_blocks` opcional), devolve as hipóteses da IA em JSON |

Exemplo (`curl`):

```bash
curl -X POST http://127.0.0.1:8788/diff \
  -H "Authorization: Bearer SEU_API_KEY" \
  -F "original=@ori.bin;type=application/octet-stream" \
  -F "modified=@mod.bin;type=application/octet-stream" \
  -o feature.tppatch
```

## Limitações conhecidas

- Só funciona entre arquivos do **mesmo tamanho** (mesmo software base) —
  não tenta alinhar/realinhar arquivos de tamanhos diferentes.
- Não sabe nada sobre blocos de código (ASW) vs. blocos de calibração como o
  `simos18-agent` sabe (via BinToolz) — se `original`/`modified` diferem em
  código, o patch vai incluir essas diferenças também, sem distinção.
- `analyze` depende de uma API key da Anthropic paga; sem ela, os outros
  comandos (`diff`/`check`/`apply`/`revert`) funcionam normalmente.
- Assim como no `simos18-agent`, depois de aplicar um patch numa ECU real, a
  próxima gravação deve ser um flash completo, não incremental.
