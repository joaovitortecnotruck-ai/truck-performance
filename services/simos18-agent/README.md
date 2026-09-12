# Simos18 Patch Agent

Automatiza a aplicação (e criação) de patches `.btp` de ECU/TCU sobre bins de
clientes — a peça técnica por trás da opção "multimapa" da Truck Performance.

Reaproveita, sem reinventar, o motor Python do BinToolz
(https://github.com/Switchleg1/BinToolz), vendorizado em `vendor/` (usado sob
autorização comercial concedida à Truck Performance — ver `license.txt`
original do BinToolz). O que este pacote adiciona é só a orquestração:
localizar o `.btp` certo para o software code do cliente e expor tudo como
CLI simples de usar.

## Como funciona, por trás

1. `identify` lê o `.bin` e descobre hardware (Simos 18.1/18.10/19, DQ250...),
   box code e **software code** (ex.: `SC800S50`) direto dos bytes do arquivo.
2. Cada patch `.btp` sabe para qual software code ele serve (fica gravado no
   cabeçalho do próprio arquivo) e é uma lista de blocos
   `{offset, bytes originais, bytes novos}`.
3. `check`/`apply` conferem se o bin bate com os bytes originais esperados
   antes de gravar — se o cliente já modificou o arquivo em algo incompatível,
   o agente recusa em vez de gravar besteira.
4. Modo padrão é `--mode ignore`: só mexe na área de código (ASW), nunca na
   área de calibração — ou seja, aplicar o multimapa **não apaga** o Stage
   que o cliente já comprou.
5. **Depois de aplicar um patch, a próxima gravação na ECU tem que ser um
   flash completo** (não incremental) — regra operacional do próprio BinToolz.

## Uso — aplicar multimapa num bin de cliente (fluxo do dia a dia)

Arquivos que você precisa ter em mãos:
- o `.bin` que o cliente enviou (original ou já com Stage);
- o `.btp` do SwitchPatch que já bate com o hardware code dele (pasta
  `patches/` do BinToolz — ex. `SL PATCH.29.33 - S50.btp` para um Simos18.1
  código `S50`).

```bash
# 1. descobrir o software code do bin do cliente
python agent.py identify cliente.bin

# 2. achar o .btp certo pra esse hardware (ex.: S50)
python agent.py list "C:\caminho\para\patches" S50

# 3. conferir se está pronto para receber o patch (não grava nada)
python agent.py check cliente.bin "C:\caminho\para\patches\SL PATCH.29.33 - S50.btp"

# 4. aplicar de verdade, preservando a calibração/Stage do cliente
python agent.py apply cliente.bin cliente_multimapa.bin \
    "C:\caminho\para\patches\SL PATCH.29.33 - S50.btp" --mode ignore
```

Pode passar mais de um `.btp` na mesma chamada de `apply`/`check` para
combinar patches (ex.: SwitchPatch + CBRICK) numa passada só.

## Uso — criar um `.btp` novo (quando ainda não existe patch pronto pra um software code)

Precisa de dois bins **do mesmo software code**, mesmo hardware, diferindo
só na feature que você quer virar patch:

1. **original.bin** — o bin de fábrica (stock) daquele software code.
2. **modified.bin** — o mesmo bin, editado no WinOLS/TunerPro (com o XDF
   correspondente) só para ligar a feature desejada (ex.: habilitar Map
   Switching). Quanto mais cirúrgica a edição, mais limpo sai o patch.

```bash
python agent.py create original.bin modified.bin nova_feature.btp --mode ignore
```

`--mode ignore` (padrão) exclui o bloco de calibração do patch gerado —
então o `.btp` resultante só carrega a parte de código/ASW, aplicável em
cima de qualquer Stage. Use `--mode force` só se você realmente quer que o
patch também sobrescreva a calibração (ex.: para redistribuir uma tabela de
calibração específica junto com a feature).

## Rodando como serviço (API HTTP)

Este é o formato pensado para uso real: um serviço separado, independente do
Next.js, que qualquer sistema (o painel admin do site, um script, etc.) chama
pela rede.

```bash
pip install -r requirements.txt
copy .env.example .env
# edite o .env: PATCHES_DIR (pasta com os .btp) e um API_KEY forte
python -m uvicorn api:app --host 0.0.0.0 --port 8787
```

Toda rota (exceto `/health`) exige o header `Authorization: Bearer <API_KEY>`.

| Rota | O que faz |
|---|---|
| `GET /health` | ping, sem autenticação |
| `POST /identify` | recebe um `.bin` (`bin=@arquivo`), devolve hardware/box code/software code |
| `GET /patches?hw_code=S50` | lista os `.btp` do catálogo (`PATCHES_DIR`) que batem com esse código |
| `POST /check` | recebe `bin` + `patch_names` (nomes do catálogo) e/ou `patch_files` (upload direto) — devolve o log, não grava nada |
| `POST /apply` | igual ao check, mais `mode` (`normal`/`ignore`/`force`) — devolve o `.bin` resultante pra download |
| `POST /create` | recebe `original` + `modified`, devolve o `.btp` gerado |

Exemplo (`curl`, testado e funcionando):

```bash
curl -X POST http://127.0.0.1:8787/apply \
  -H "Authorization: Bearer SEU_API_KEY" \
  -F "bin=@cliente.bin;type=application/octet-stream" \
  -F "patch_names=SL PATCH.29.33 - S50.btp" \
  -F "mode=ignore" \
  -o cliente_multimapa.bin
```

`patch_names` pode repetir o campo pra aplicar mais de um patch numa chamada
só; `patch_files` aceita upload direto de um `.btp` que ainda não está no
catálogo do servidor (ex.: um recém-criado via `/create`).

Como não roda na Vercel/Next.js, esse serviço precisa de um host próprio com
Python (uma VPS pequena, ou até uma máquina da própria oficina) — o site só
precisa saber a URL e o `API_KEY` pra chamá-lo.

## Pendências antes de ligar isso no site

- [ ] Confirmar com um flash real (bancada) se o checksum sai correto após
      `apply` + flash completo, ou se depende de outra ferramenta no meio.
- [ ] Decidir a lista de software codes que a Truck Performance vai suportar
      de cara, e garantir que existe um `.btp` de SwitchPatch pra cada um
      (senão entra no fluxo de `create` acima).
- [ ] Decidir onde este serviço roda (não é para rodar na Vercel/Next.js —
      precisa de Python e acesso aos arquivos `.btp`/`.bin`, então serviço
      separado, ex. um pequeno servidor próprio ou VPS).
