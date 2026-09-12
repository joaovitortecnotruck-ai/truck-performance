# Como instalar a plataforma Truck Performance — passo a passo

Este guia parte do zero: assume que você não tem nada instalado ainda.
Siga na ordem. Cada passo diz exatamente o que digitar.

---

## Parte 1 — Instalar os programas necessários

### 1. Instalar o Node.js

O Node.js é o programa que roda o código da plataforma no seu computador.

1. Acesse https://nodejs.org
2. Baixe a versão **LTS** (a recomendada, do lado esquerdo)
3. Instale normalmente (Next > Next > Install), como qualquer programa Windows
4. Para confirmar que instalou certo, abra o **Prompt de Comando** (Windows: tecla
   Windows, digite `cmd`, Enter) e digite:

   ```
   node -v
   npm -v
   ```

   Se aparecer um número de versão em cada linha (ex: `v20.14.0` e `10.7.0`), deu certo.

### 2. Instalar um editor de código (recomendado)

Não é obrigatório, mas facilita muito.

1. Acesse https://code.visualstudio.com
2. Baixe e instale o **VS Code**

---

## Parte 2 — Extrair e abrir o projeto

1. Baixe o arquivo `truck-performance-platform.zip` que te enviei
2. Clique com o botão direito nele → **Extrair tudo...**
3. Escolha uma pasta fácil de achar, por exemplo `C:\Projetos\`
4. Você vai ficar com uma pasta `truck-performance` dentro dela
5. Abra o VS Code → **Arquivo > Abrir Pasta...** → selecione a pasta `truck-performance`

---

## Parte 3 — Instalar as dependências do projeto

1. No VS Code, abra o terminal integrado: menu **Terminal > Novo Terminal**
   (ou Ctrl + `)
2. Confirme que o terminal está dentro da pasta `truck-performance`
   (o caminho aparece no topo do terminal)
3. Digite:

   ```
   npm install
   ```

4. Aguarde. Isso baixa todas as bibliotecas usadas pelo projeto
   (Next.js, React, Tailwind, Supabase etc.). Pode levar de 1 a 3 minutos.

Ao final você verá uma pasta nova chamada `node_modules` — é normal, é onde
ficam essas bibliotecas. Não precisa mexer nela.

---

## Parte 4 — Criar o banco de dados (Supabase)

A plataforma usa o **Supabase** como banco de dados, login de usuários e
armazenamento de arquivos. É gratuito para começar.

### 4.1 Criar a conta e o projeto

1. Acesse https://supabase.com e crie uma conta (pode usar login do GitHub ou Google)
2. Clique em **New Project**
3. Preencha:
   - **Name**: `truck-performance` (ou o nome que quiser)
   - **Database Password**: crie uma senha forte e **guarde ela** em algum lugar seguro
   - **Region**: escolha `South America (São Paulo)` para ficar mais rápido
4. Clique em **Create new project** e aguarde alguns minutos (ele "provisiona" o banco)

### 4.2 Rodar o script que cria as tabelas

1. Dentro do projeto no Supabase, no menu da esquerda, clique em **SQL Editor**
2. Clique em **New query**
3. No VS Code, abra o arquivo `supabase/schema.sql` (dentro da pasta do projeto)
4. Copie **todo** o conteúdo desse arquivo
5. Cole dentro do SQL Editor do Supabase
6. Clique em **Run** (ou Ctrl + Enter)
7. Se aparecer "Success. No rows returned", deu certo — todas as tabelas
   (pedidos, clientes, veículos, arquivos, mensagens, pagamentos, termos etc.)
   foram criadas

### 4.3 Criar os espaços de armazenamento (Storage) para os arquivos

1. No menu da esquerda do Supabase, clique em **Storage**
2. Clique em **New bucket**
3. Crie um bucket chamado `arquivos-originais` (marque como **privado**, não público)
4. Clique em **New bucket** de novo e crie outro chamado `arquivos-modificados`
   (também privado)

### 4.4 Pegar as chaves de acesso

1. No menu da esquerda, clique em **Project Settings** (ícone de engrenagem) → **API**
2. Você vai precisar de dois valores desta página:
   - **Project URL** (algo como `https://xxxxxxxxxxx.supabase.co`)
   - **anon public key** (uma chave longa de letras e números)

Guarde essas duas informações — você vai usar no próximo passo.

---

## Parte 5 — Configurar as variáveis de ambiente

1. Na pasta do projeto, ache o arquivo `.env.example`
2. Faça uma cópia dele e renomeie a cópia para `.env.local`
   (no Windows: copiar e colar, depois renomear; certifique-se que a extensão
   não vira `.env.local.txt` — no VS Code isso não acontece)
3. Abra o `.env.local` e substitua pelos valores que você pegou no Supabase:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
   ```

4. Salve o arquivo (Ctrl + S)

---

## Parte 6 — Rodar a plataforma no seu computador

1. No terminal do VS Code (dentro da pasta do projeto), digite:

   ```
   npm run dev
   ```

2. Aguarde aparecer uma mensagem parecida com:

   ```
   ▲ Next.js 14.2.35
   - Local:  http://localhost:3000
   ```

3. Abra o navegador (Chrome, Edge etc.) e acesse:

   ```
   http://localhost:3000
   ```

4. Você vai cair direto na tela de **Login** da Truck Performance

Pronto — a plataforma está rodando na sua máquina. Para parar, volte no
terminal e aperte `Ctrl + C`.

> **Importante:** nesta primeira entrega (Fase 1), as telas de login, novo
> pedido, upload e mudança de status já têm toda a interface funcionando,
> mas ainda **não estão gravando os dados no Supabase** — os pedidos que
> você vê são de demonstração (arquivo `lib/mock-data.ts`). O próximo passo
> do desenvolvimento é ligar cada formulário e botão ao banco de dados real
> que você acabou de criar. Isso está detalhado na seção "Próximos passos"
> do `README.md`.

---

## Parte 7 — Colocar no ar (deploy), quando quiser publicar de verdade

Quando quiser que a plataforma fique acessível pela internet (não só no seu
computador), o caminho mais simples é a **Vercel** (empresa que mantém o
Next.js, também tem plano gratuito):

1. Suba o código do projeto para um repositório no **GitHub**
   (crie uma conta em https://github.com se ainda não tiver, crie um novo
   repositório e siga as instruções dele para "subir" a pasta do projeto)
2. Acesse https://vercel.com, crie conta com login do GitHub
3. Clique em **Add New > Project** e selecione o repositório que você acabou de subir
4. Na tela de configuração, adicione as mesmas variáveis do seu `.env.local`
   (`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`) em
   **Environment Variables**
5. Clique em **Deploy**

Em poucos minutos a Vercel te entrega um link público (algo como
`truck-performance.vercel.app`) já funcionando.

---

## Se algo der errado

- **`npm install` trava ou dá erro de rede**: verifique sua internet, ou tente
  de novo mais tarde (às vezes é instabilidade do servidor de pacotes).
- **`npm run dev` não abre / dá erro de porta em uso**: feche outros
  programas que possam estar usando a porta 3000, ou rode
  `npm run dev -- -p 3001` e acesse `http://localhost:3001`.
- **A tela abre sem estilo (sem as cores/fontes)**: confirme que você rodou
  `npm install` antes de `npm run dev`, e que o computador tem internet
  ativa (as fontes são carregadas do Google Fonts na primeira vez que a
  página é montada).
- **Erro mencionando `SUPABASE_URL` ou `SUPABASE_ANON_KEY`**: confira se o
  arquivo `.env.local` existe (não só o `.env.example`) e se os valores
  foram colados corretamente, sem espaços extras.

Qualquer dúvida durante a instalação, me chama que eu te ajudo a resolver.
