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

## Janela (gui/) — o .exe da Área de Trabalho

`gui/app.py` é uma janela Tkinter simples que fala com o serviço local por
HTTP (mesma API acima) — escolher bin, identificar, marcar patch(es) com
nome amigável (`patch_labels.py`), aplicar, e baixar o XDF compatível.

Pra gerar de novo o `TruckPerformance-Multimapa.exe` depois de editar
`gui/app.py` (troque `$base` se o projeto estiver em outra pasta):

```powershell
$base = "C:\Users\Avell\Desktop\truck-performance\services\simos18-agent"
cd $base
.\.venv\Scripts\python.exe -m PyInstaller --onefile --windowed --name "TruckPerformance-Multimapa" `
  --icon "$base\gui\icon.ico" `
  --add-data "$base\gui\icon.ico;." `
  --add-data "$base\gui\icon_header.png;." `
  --add-data "$base\gui\data\b58_switch_3076.bin;data" `
  --add-data "$base\gui\data\b58_switch_3081.bin;data" `
  --distpath dist --workpath build_tmp --specpath build_tmp "$base\gui\app.py"

Copy-Item "dist\TruckPerformance-Multimapa.exe" -Destination "C:\Users\Avell\Desktop\TruckPerformance-Multimapa.exe" -Force
# copia pras DUAS pastas "Desktop" que existem nesta maquina (o OneDrive
# parece mostrar C:\Users\Avell\OneDrive\Desktop como area de trabalho de
# verdade, mesmo o Windows registrando C:\Users\Avell\Desktop como oficial
# via [Environment]::GetFolderPath("Desktop")) - ja causou confusao antes
# (ver nota do PROJECT_DIR abaixo), entao manda pras duas pra nao depender
# de qual delas esta "certa" nesse momento.
Copy-Item "dist\TruckPerformance-Multimapa.exe" -Destination "C:\Users\Avell\OneDrive\Desktop\TruckPerformance-Multimapa.exe" -Force -ErrorAction SilentlyContinue
```

Nota: o caminho do projeto (`$base` aqui, e `PROJECT_DIR` em `gui/paths.py`) já
mudou de lugar uma vez nesta máquina (o OneDrive re-apontou o Desktop). Se
mudar de novo, só precisa trocar em `gui/paths.py` - `state.py`, `audit.py`
e `app.py` (via `ENV_PATH`) todos derivam dali.

Nota: `--add-data`/`--icon` com caminho relativo dá erro quando
`--specpath` é uma subpasta (o PyInstaller resolve relativo à pasta do
`.spec`, não à pasta atual) — por isso os caminhos acima são absolutos.

Pra trocar o ícone: edite `gui/make_icon.py` (desenha com Pillow) e rode
`.\.venv\Scripts\python.exe gui\make_icon.py` — regenera `gui/icon.ico` e
`gui/icon_header.png`, depois recompile o `.exe` com o comando acima.

## Simulador de troca de mapa (seção 6 da janela)

Não existe emulador confiável do processador da ECU (TriCore) pra "rodar" o
código de verdade fora do hardware — nem a própria comunidade do BinToolz
tem isso. O que dá pra fazer sem hardware é uma **calculadora**: ela lê os
valores reais de calibração do arquivo (via `gui/map_switch_data.py`,
endereços tirados do XDF) e simula a decisão:

- Timeout, RPM mínimo, pedal mínimo e RPM alvo pós-troca (lidos de verdade
  do arquivo, categoria "Map Switching" do XDF).
- Limitador de RPM de cada mapa (1 a 4 — Mapa 5 não foi localizado nesta
  versão do XDF, então não incluí pra não inventar valor).
- Com RPM/pedal/mapa que você digitar, mostra se a troca seria permitida.

Clicar num quadrado "Mapa N" também ajusta o RPM do painel pra N×1000
(Mapa 1→1000, Mapa 2→2000...) — é só uma conveniência visual pra ficar
claro que trocou de mapa, não é um valor lido do arquivo (o limitador de
RPM de cada mapa, esse sim lido de verdade, aparece separado embaixo).

O botão **"🔥 Simular corte Anti-Lag (pé fora)"** faz o mesmo tipo de
calculadora pro Rolling Anti-Lag (categoria "RAL" do XDF): mostra as
condições reais do arquivo (temperatura mínima de óleo/arrefecimento,
desaceleração máxima) e simula "ativo" quando pedal ≤10% e RPM ≥1500 com o
botão ligado. Se o mapa selecionado ainda estiver com RAL desligado no
arquivo (`Enable RAL` = 0, como está neste Tiguan), o painel avisa que é
ilustrativo.

Hoje cobre **S50, A05, LB6, O30 e V30** — endereços extraídos e validados
(com o SwitchPatch real aplicado em modo `force` sobre um bin de fábrica de
cada um, valores conferidos por sanidade) contra os XDFs pequenos e
dedicados em `BinToolz-main/definitions/<HW> Switch Patch.29.33.V2.xdf`.
Pra outro código, repita o processo em `gui/map_switch_data.py` (mesmo
esquema de `<title>` nesses XDFs dedicados: "Timeout", "Minimum engagement
RPM", "Minimum pedal", "Target RPM", "RPM limiter" ×4, "Enable RAL" ×4,
mais os três títulos de RAL global) — não precisa mexer no resto do código,
só adicionar a entrada em `_HW_RAW`.

**Isso não substitui teste real** — é só uma conferência de que os números
de calibração fazem sentido.

## Teste em bancada (a prova real)

Não achei nos PID lists de vocês um parâmetro pronto tipo "mapa ativo" —
então a forma de confirmar na prática é acompanhar ao vivo um valor que
você sabe que é diferente entre os mapas (ex.: limitador de RPM, alvo de
boost, o que você tiver configurado diferente entre os slots no WinOLS).

1. Grave o bin com o SwitchPatch aplicado — **flash completo**, nunca
   incremental (regra do próprio BinToolz).
2. Ligue a chave/potenciômetro no pino correto (conforme a documentação de
   vocês de habilitação).
3. Logue com o SimosTools (Android) ou outra ferramenta compatível com
   HSL/Mode22, adicionando ao log o parâmetro que muda entre mapas.
4. Com o motor ligado, dentro das condições mínimas que o simulador da
   seção 6 calculou (ex.: RPM e pedal acima do mínimo), mude a posição da
   chave/pot e observe se esse parâmetro no log muda junto.
5. Se mudar de forma consistente com o mapa selecionado, a troca está
   funcionando de verdade — essa é a prova real, não o simulador.

Faça esse teste com o carro parado/em bancada, não dirigindo — está
mexendo em limitador de RPM e boost ao vivo.

## EDC17CP54 (Amarok V6, diesel) - experimental

Adicionamos suporte experimental a essa plataforma (diferente da Simos18 -
é Bosch diesel, TriCore, flash de 8MB). Descoberto e validado com um par
real ORI/multimapa (box `2H6907311AC`, software `1556APFB`):

- `vendor/simos_bin.py`: entrada `"EDC17CP54"` no dict `simosHW` (endereço
  de box code em `0x2CE3A8`, software code em `0x0506D2`, ambos achados por
  busca de string no bin - não são documentação oficial de ninguém).
- **Limitação importante**: não sabemos o layout real de blocos/calibração
  dessa plataforma, então definimos um único "bloco" cobrindo o arquivo
  inteiro (`blocks=[SimosBlock(0,0,8388608)]`). Na prática isso quer dizer
  que **só o modo `force` tem efeito** aqui - `ignore` acabaria não
  escrevendo nada, porque ele existe pra pular o bloco de calibração, e
  pra essa plataforma "o bloco de calibração" = o arquivo inteiro.
- O patch de exemplo (`.btp` gerado a partir do par ORI/multimapa real,
  cobrindo box `2H6907311AC`/software `1556APFB`) fica em
  `patches_custom/` (fora do git, é dado sensível da sua biblioteca - não
  redistribua). Pra outra revisão de software (`APIB`, `APE1`, etc.),
  repita o `create` com o par ORI/multimapa daquela revisão - o próprio
  motor recusa aplicar um `.btp` de uma revisão em outra (confere o
  software code no cabeçalho do patch).
- **Isso nunca foi testado em bancada** - só validado byte a byte contra o
  arquivo de referência que você já tinha. Vale muito mais a pena aqui do
  que no Simos18 (ver seção de teste em bancada acima), já que é uma
  plataforma nova pro nosso motor.

Durante essa investigação também achamos e corrigimos um bug real: o
comando `check` (CLI e `/check` da API) estava sempre usando modo
`ignore`, que **perdoa silenciosamente** uma calibração divergente em vez
de reportar erro - só o modo `normal` faz essa checagem valer. Agora
`check` usa `normal` por padrão (`--mode` continua disponível pra mudar).

## Pendências antes de ligar isso no site

- [ ] Confirmar com um flash real (bancada) se o checksum sai correto após
      `apply` + flash completo, ou se depende de outra ferramenta no meio.
- [ ] Decidir a lista de software codes que a Truck Performance vai suportar
      de cara, e garantir que existe um `.btp` de SwitchPatch pra cada um
      (senão entra no fluxo de `create` acima).
- [ ] Decidir onde este serviço roda (não é para rodar na Vercel/Next.js —
      precisa de Python e acesso aos arquivos `.btp`/`.bin`, então serviço
      separado, ex. um pequeno servidor próprio ou VPS).
