# Truck Performance — Plataforma de Remapeamento

Plataforma web para gerenciamento, envio, processamento e entrega de arquivos
de remapeamento automotivo, da **Truck Performance** em parceria com a
**Diesel Master**.

## Stack

Next.js 14 (App Router) · TypeScript · React · Tailwind CSS · Supabase
(Auth, Database, Storage) · Vercel.

## Status atual — Fase 1

Esta primeira entrega cobre a **estrutura e as telas da Fase 1** do escopo:

- [x] Login e cadastro de cliente (UI pronta, autenticação a conectar ao Supabase Auth)
- [x] Dashboard do cliente (indicadores + lista de pedidos)
- [x] Novo pedido — dados do veículo, upload do arquivo original, escolha de
      Stage, opcionais, sistemas de emissões (com aviso legal e checkbox
      obrigatório), resumo de valores em tempo real
- [x] Detalhe do pedido — timeline de status, chat do pedido, download do
      arquivo modificado com aceite de termos obrigatório
- [x] Painel administrativo — dashboard, lista de pedidos com filtros, tela
      administrativa do pedido (baixar original, enviar modificado, mudar status)
- [x] Precificação (catálogo de Stages/opcionais editável)
- [x] Esqueleto de "Banco de arquivos" (Fase 2/3)
- [x] Schema completo do banco em `supabase/schema.sql`, incluindo RLS inicial

**Importante:** o app hoje roda com **dados mock** (`lib/mock-data.ts`,
`lib/catalog.ts`) para o front-end ficar completamente navegável sem precisar
de um projeto Supabase configurado. Os botões de login, envio de pedido,
upload, mudança de status etc. estão desenhados para a função real, mas ainda
não persistem dados — o próximo passo é ligar tudo ao Supabase (ver abaixo).

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha com as chaves do seu projeto Supabase
npm run dev
```

Abra http://localhost:3000 — a rota `/` redireciona para `/login`.

Páginas principais:

- `/login`, `/cadastro`
- `/dashboard`, `/novo-pedido`, `/pedidos/[id]`
- `/admin`, `/admin/pedidos`, `/admin/pedidos/[id]`, `/admin/precificacao`,
  `/admin/clientes`, `/admin/banco-de-arquivos`, `/admin/configuracoes`

## Próximos passos para sair do modo mock

1. Criar um projeto no Supabase e rodar `supabase/schema.sql` no SQL editor.
2. Criar os buckets de Storage (`arquivos-originais`, `arquivos-modificados`)
   seguindo a estrutura `cliente/{customer_id}/pedido/{order_id}/original|modificado`.
3. Preencher `.env.local` com `NEXT_PUBLIC_SUPABASE_URL` e
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Trocar `lib/mock-data.ts` por consultas reais via `lib/supabase/client.ts`
   (Client Components) e `lib/supabase/server.ts` (Server Components/Actions).
5. Implementar os formulários (login, cadastro, novo pedido) como Server
   Actions que gravam em `customers`, `vehicles`, `orders`, `files`.
6. Revisar e completar as políticas de RLS (o schema traz o esqueleto para
   `orders` e `customers`; falta replicar o padrão para `vehicles`, `files`,
   `messages`, `term_acceptances` e `notifications`).
7. Configurar upload real para o Supabase Storage com URLs assinadas
   temporárias para download.

## Fases seguintes (fora do escopo desta entrega)

- **Fase 2:** pagamentos (PIX/Mercado Pago/Asaas/Stripe), notificações
  (WhatsApp/e-mail/push), gráfico de potência/torque, histórico avançado.
- **Fase 3:** identificação automática de HW/SW, comparação binária, agente
  de IA de calibração (Truck Performance AI Calibration Agent).
- **Fase 4:** integração com WinOLS, agente desktop, geração automatizada de
  patches.
