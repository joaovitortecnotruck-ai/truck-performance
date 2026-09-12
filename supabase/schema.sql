-- ============================================================================
-- Truck Performance — schema inicial (Fase 1)
-- Rodar no SQL editor do Supabase. Ajuste conforme necessidade.
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- USERS / CUSTOMERS
-- ---------------------------------------------------------------------------
-- `auth.users` já é gerenciado pelo Supabase Auth. Esta tabela guarda o perfil.
create type user_role as enum ('cliente', 'admin', 'tuner', 'revendedor', 'suporte');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'cliente',
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  nome text not null,
  empresa text,
  documento text not null, -- CPF ou CNPJ
  telefone text not null,
  whatsapp text not null,
  email text not null,
  cidade text not null,
  estado text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- VEHICLES / ECU
-- ---------------------------------------------------------------------------
create table if not exists public.ecu_types (
  id uuid primary key default uuid_generate_v4(),
  fabricante text,
  modelo text not null,
  hw text,
  sw text,
  numero_bosch text,
  numero_oem text
);

create table if not exists public.vehicles (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  marca text not null,
  modelo text not null,
  motorizacao text not null,
  ano text not null,
  km text,
  placa text not null,
  ecu_type_id uuid references public.ecu_types(id),
  tcu_modelo text,
  equipamento text,
  metodo_leitura text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- SERVICES / STAGES / OPTIONS / PRICING
-- ---------------------------------------------------------------------------
create table if not exists public.stages (
  id text primary key, -- 'original' | 'stage1' | ... | 'custom'
  nome text not null,
  descricao text,
  ganho_potencia text,
  ganho_torque text
);

create type option_category as enum ('adicional', 'emissao');

create table if not exists public.options (
  id text primary key,
  categoria option_category not null,
  nome text not null,
  descricao text,
  compativel_com text[] -- ids de ecu_types/veículos, quando restrito
);

-- Preço cadastrável por ECU / veículo / motorização / stage / opcional.
-- `escopo_tipo` + `escopo_id` deixam o preço genérico (default) ou específico.
create table if not exists public.pricing (
  id uuid primary key default uuid_generate_v4(),
  item_tipo text not null check (item_tipo in ('stage', 'option')),
  item_id text not null, -- referencia stages.id ou options.id
  escopo_tipo text not null default 'default' check (escopo_tipo in ('default', 'ecu_type', 'vehicle_model')),
  escopo_id text,
  preco numeric(10, 2) not null,
  updated_at timestamptz not null default now(),
  unique (item_tipo, item_id, escopo_tipo, escopo_id)
);

create table if not exists public.estimated_gains (
  id uuid primary key default uuid_generate_v4(),
  marca text not null,
  modelo text not null,
  motorizacao text not null,
  stage_id text not null references public.stages(id),
  potencia_original text,
  torque_original text,
  potencia_modificado text,
  torque_modificado text
);

-- ---------------------------------------------------------------------------
-- ORDERS
-- ---------------------------------------------------------------------------
create type order_status as enum (
  'recebido',
  'aguardando_pagamento',
  'pagamento_confirmado',
  'em_analise',
  'em_desenvolvimento',
  'em_processamento',
  'aguardando_informacoes',
  'arquivo_pronto',
  'finalizado',
  'cancelado'
);

create type payment_status as enum ('pendente', 'pago', 'parcial', 'cancelado');

create sequence if not exists orders_seq start 1;

create table if not exists public.orders (
  id text primary key, -- gerado via generate_order_id()
  customer_id uuid not null references public.customers(id),
  vehicle_id uuid not null references public.vehicles(id),
  stage_id text not null references public.stages(id),
  opcionais text[] not null default '{}', -- ids de options
  observacoes text,
  subtotal numeric(10, 2) not null default 0,
  desconto numeric(10, 2) not null default 0,
  total numeric(10, 2) not null default 0,
  status order_status not null default 'recebido',
  pagamento payment_status not null default 'pendente',
  created_at timestamptz not null default now()
);

create or replace function public.generate_order_id() returns text as $$
declare
  seq bigint;
begin
  seq := nextval('orders_seq');
  return 'TP-' || extract(year from now())::text || '-' || lpad(seq::text, 6, '0');
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- FILES (Supabase Storage guarda o binário; esta tabela guarda os metadados)
-- Estrutura de bucket sugerida: cliente/{customer_id}/pedido/{order_id}/original|modificado
-- ---------------------------------------------------------------------------
create table if not exists public.files (
  id uuid primary key default uuid_generate_v4(),
  order_id text not null references public.orders(id) on delete cascade,
  tipo text not null check (tipo in ('original', 'modificado')),
  storage_path text not null,
  nome text not null,
  tamanho_bytes bigint,
  hw text,
  sw text,
  numero_bosch text,
  numero_oem text,
  checksum text,
  tipo_leitura text,
  ferramenta text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- MESSAGES (chat por pedido)
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  order_id text not null references public.orders(id) on delete cascade,
  autor text not null check (autor in ('cliente', 'admin')),
  texto text,
  anexo_storage_path text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- PAYMENTS
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default uuid_generate_v4(),
  order_id text not null references public.orders(id) on delete cascade,
  valor numeric(10, 2) not null,
  status payment_status not null default 'pendente',
  metodo text, -- pix | mercado_pago | asaas | stripe | manual
  confirmado_por uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- TERMS / TERM ACCEPTANCES
-- ---------------------------------------------------------------------------
create table if not exists public.terms (
  id text primary key, -- 'emissoes' | 'leitura_gravacao'
  versao text not null,
  texto text not null
);

create table if not exists public.term_acceptances (
  id uuid primary key default uuid_generate_v4(),
  order_id text not null references public.orders(id) on delete cascade,
  profile_id uuid not null references public.profiles(id),
  term_id text not null references public.terms(id),
  versao text not null,
  ip text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS / ACTIVITY LOGS
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  order_id text references public.orders(id) on delete cascade,
  titulo text not null,
  mensagem text,
  lida boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default uuid_generate_v4(),
  order_id text references public.orders(id) on delete set null,
  profile_id uuid references public.profiles(id),
  acao text not null, -- ex: 'pedido_criado', 'arquivo_enviado', 'status_alterado'
  detalhes jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- ROW LEVEL SECURITY (esqueleto — revisar antes de ir para produção)
-- ============================================================================
alter table public.customers enable row level security;
alter table public.vehicles enable row level security;
alter table public.orders enable row level security;
alter table public.files enable row level security;
alter table public.messages enable row level security;
alter table public.term_acceptances enable row level security;
alter table public.notifications enable row level security;

-- Cliente só enxerga os próprios registros.
create policy "cliente ve os proprios pedidos"
  on public.orders for select
  using (
    customer_id in (select id from public.customers where profile_id = auth.uid())
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "cliente ve os proprios dados"
  on public.customers for select
  using (
    profile_id = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Repetir o padrão acima (join por order_id -> customer_id -> profile_id)
-- para vehicles, files, messages, term_acceptances e notifications.
