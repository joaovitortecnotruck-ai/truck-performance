-- ============================================================================
-- Truck Performance — schema do banco (Supabase), extraído do banco real em 2026-10-25.
-- Já inclui as migrations 013, 014 e 015. Serve de referência / para recriar o projeto
-- do zero no SQL Editor. Mudanças novas: crie supabase/migration_0XX_*.sql e atualize aqui.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- TABELAS
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid not null,
  name text,
  company text,
  phone text,
  document text,
  city text,
  state text,
  role text default 'client'::text not null,
  created_at timestamp with time zone default now(),
  whatsapp text,
  constraint profiles_pkey primary key (id),
  constraint profiles_id_fkey foreign key (id) references auth.users(id) on delete cascade,
  constraint profiles_role_check check (role = any (array['client', 'admin', 'technician']))
);

create table public.services (
  id uuid default gen_random_uuid() not null,
  code text not null,
  name text not null,
  category text not null, -- stage | optional | emissions
  description text,
  price numeric(10,2) default 0 not null,
  active boolean default true not null,
  sort_order integer default 0 not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint services_pkey primary key (id),
  constraint services_code_key unique (code)
);

create table public.terms (
  id uuid default gen_random_uuid() not null,
  code text not null, -- READ_WRITE | EMISSIONS
  version text not null,
  title text not null,
  body text not null,
  active boolean default true,
  created_at timestamp with time zone default now(),
  constraint terms_pkey primary key (id)
);

create table public.vehicles (
  id uuid default gen_random_uuid() not null,
  client_id uuid not null,
  brand text not null,
  model text not null,
  engine text,
  year integer,
  mileage bigint,
  plate text not null,
  ecu_model text,
  tcu_model text,
  created_at timestamp with time zone default now(),
  -- placa normalizada: agrupa pedidos do mesmo carro ("Arquivos deste veículo")
  plate_norm text generated always as (upper(regexp_replace(coalesce(plate, ''), '[^A-Za-z0-9]', '', 'g'))) stored,
  constraint vehicles_pkey primary key (id),
  constraint vehicles_client_id_fkey foreign key (client_id) references public.profiles(id) on delete cascade
);

create table public.orders (
  id uuid default gen_random_uuid() not null,
  order_number text not null, -- TP-XXXXXX, preenchido pelo trigger set_order_number
  client_id uuid not null,
  vehicle_id uuid not null,
  tool text,
  read_method text,
  requested_service text not null,
  recommended_write_method text,
  orientation text,
  status text default 'received'::text not null, -- received | in_review | in_progress | ready | completed | cancelled
  emissions_related boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  total_price numeric(10,2) default 0 not null, -- 0 = "Aguardando valor"
  payment_status text default 'pending'::text not null,
  constraint orders_pkey primary key (id),
  constraint orders_order_number_key unique (order_number),
  constraint orders_client_id_fkey foreign key (client_id) references public.profiles(id),
  constraint orders_vehicle_id_fkey foreign key (vehicle_id) references public.vehicles(id)
);

create table public.order_items (
  id uuid default gen_random_uuid() not null,
  order_id uuid not null,
  service_code text not null,
  service_name text not null,
  category text not null,
  unit_price numeric(10,2) default 0 not null,
  created_at timestamp with time zone default now() not null,
  constraint order_items_pkey primary key (id),
  constraint order_items_order_id_fkey foreign key (order_id) references public.orders(id) on delete cascade
);

create table public.files (
  id uuid default gen_random_uuid() not null,
  order_id uuid not null,
  uploaded_by uuid,
  file_type text, -- original (cliente) | final (modificado, admin) | attachment
  original_name text not null,
  storage_path text not null, -- bucket ecu-files: {client_id}/...
  size_bytes bigint,
  sha256 text,
  created_at timestamp with time zone default now(),
  hw text,
  sw text,
  -- download único do arquivo final (ver consume_file_download / grant_extra_download)
  downloads_allowed integer default 1 not null,
  downloads_used integer default 0 not null,
  download_unlocked_until timestamp with time zone,
  constraint files_pkey primary key (id),
  constraint files_order_id_fkey foreign key (order_id) references public.orders(id) on delete cascade,
  constraint files_uploaded_by_fkey foreign key (uploaded_by) references public.profiles(id),
  constraint files_file_type_check check (file_type = any (array['original', 'final', 'attachment']))
);

create table public.download_logs (
  id uuid default gen_random_uuid() not null,
  order_id uuid,
  file_id uuid,
  user_id uuid,
  downloaded_at timestamp with time zone default now(),
  ip_address inet,
  user_agent text,
  constraint download_logs_pkey primary key (id),
  constraint download_logs_order_id_fkey foreign key (order_id) references public.orders(id) on delete cascade,
  constraint download_logs_file_id_fkey foreign key (file_id) references public.files(id) on delete cascade,
  constraint download_logs_user_id_fkey foreign key (user_id) references public.profiles(id)
);

create table public.messages (
  id uuid default gen_random_uuid() not null,
  order_id uuid,
  sender_id uuid,
  body text not null,
  internal boolean default false, -- nota interna, só admin vê
  created_at timestamp with time zone default now(),
  client_id uuid,
  constraint messages_pkey primary key (id),
  constraint messages_order_id_fkey foreign key (order_id) references public.orders(id) on delete cascade,
  constraint messages_sender_id_fkey foreign key (sender_id) references public.profiles(id),
  constraint messages_client_id_fkey foreign key (client_id) references public.profiles(id)
);

create table public.term_acceptances (
  id uuid default gen_random_uuid() not null,
  order_id uuid,
  user_id uuid,
  term_id uuid,
  accepted_at timestamp with time zone default now(),
  ip_address inet,
  user_agent text,
  constraint term_acceptances_pkey primary key (id),
  constraint term_acceptances_order_id_fkey foreign key (order_id) references public.orders(id) on delete cascade,
  constraint term_acceptances_term_id_fkey foreign key (term_id) references public.terms(id),
  constraint term_acceptances_user_id_fkey foreign key (user_id) references public.profiles(id)
);

create table public.activity_logs (
  id uuid default gen_random_uuid() not null,
  order_id uuid,
  actor_id uuid,
  action text not null,
  details jsonb,
  created_at timestamp with time zone default now() not null,
  constraint activity_logs_pkey primary key (id),
  constraint activity_logs_order_id_fkey foreign key (order_id) references public.orders(id) on delete cascade,
  constraint activity_logs_actor_id_fkey foreign key (actor_id) references public.profiles(id)
);

create index vehicles_plate_idx on public.vehicles using btree (plate);
create index vehicles_plate_norm_idx on public.vehicles using btree (plate_norm);
create index orders_client_idx on public.orders using btree (client_id);
create index orders_status_idx on public.orders using btree (status);

-- ---------------------------------------------------------------------------
-- FUNÇÕES E TRIGGERS
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from profiles where id = auth.uid() and role in ('admin', 'technician'));
$$;

-- cria o perfil quando alguém se cadastra (dados vêm do user_metadata do signUp)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, name, company, phone, document, city, state, role)
  values (new.id, new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'company',
          new.raw_user_meta_data->>'phone', new.raw_user_meta_data->>'document',
          new.raw_user_meta_data->>'city', new.raw_user_meta_data->>'state', 'client')
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_order_number()
returns trigger language plpgsql set search_path = public as $$
declare
  candidate text;
begin
  if new.order_number is null then
    loop
      candidate := 'TP-' || lpad((floor(random() * 1000000))::text, 6, '0');
      exit when not exists (select 1 from public.orders where order_number = candidate);
    end loop;
    new.order_number := candidate;
  end if;
  return new;
end;
$$;
create trigger trg_set_order_number before insert on public.orders
  for each row execute function public.set_order_number();

-- só admin muda o papel (role) de um usuário
create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not is_admin() then
    raise exception 'apenas admin pode alterar o papel do usuario';
  end if;
  return new;
end;
$$;
create trigger trg_protect_profile_role before update on public.profiles
  for each row execute function public.protect_profile_role();

-- download único: marca como baixado ANTES de liberar o link; o storage só deixa
-- o cliente ler o arquivo final durante a janela de 60s aberta aqui
create or replace function public.consume_file_download(p_file_id uuid, p_ip text, p_user_agent text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_path text;
  v_order uuid;
begin
  if auth.uid() is null then
    raise exception 'nao autenticado';
  end if;

  update files f
     set downloads_used = f.downloads_used + 1,
         download_unlocked_until = now() + interval '60 seconds'
    from orders o
   where f.id = p_file_id
     and o.id = f.order_id
     and o.client_id = auth.uid()
     and f.file_type = 'final'
     and o.status not in ('cancelled', 'cancelado')
     and f.downloads_used < f.downloads_allowed
  returning f.storage_path, f.order_id into v_path, v_order;

  if v_path is null then
    raise exception 'download indisponivel';
  end if;

  insert into download_logs (order_id, file_id, user_id, ip_address, user_agent)
  values (v_order, p_file_id, auth.uid(), nullif(p_ip, '')::inet, p_user_agent);

  return v_path;
end;
$$;

-- "Liberar novo download" (admin)
create or replace function public.grant_extra_download(p_file_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'apenas admin';
  end if;
  update files set downloads_allowed = downloads_used + 1 where id = p_file_id;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_order_number() from public, anon, authenticated;
revoke execute on function public.protect_profile_role() from public, anon, authenticated;
revoke all on function public.consume_file_download(uuid, text, text) from public, anon;
revoke all on function public.grant_extra_download(uuid) from public, anon;
grant execute on function public.consume_file_download(uuid, text, text) to authenticated;
grant execute on function public.grant_extra_download(uuid) to authenticated;

-- (o projeto também tem o event trigger padrão do Supabase rls_auto_enable,
--  que liga RLS em toda tabela nova do schema public)

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.terms enable row level security;
alter table public.vehicles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.files enable row level security;
alter table public.download_logs enable row level security;
alter table public.messages enable row level security;
alter table public.term_acceptances enable row level security;
alter table public.activity_logs enable row level security;

-- profiles
create policy "profile own or admin" on public.profiles for select using (id = auth.uid() or is_admin());
create policy "profile own update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "admin atualiza qualquer perfil" on public.profiles for update using (is_admin()) with check (is_admin());

-- services
create policy "services public read active" on public.services for select to anon using (active = true);
create policy "services authenticated read" on public.services for select to authenticated using (active = true);
create policy "services admin manage" on public.services for all to authenticated using (is_admin()) with check (is_admin());

-- terms
create policy "usuarios autenticados leem termos ativos" on public.terms for select using (active = true);
create policy "admin gerencia termos" on public.terms for all using (is_admin()) with check (is_admin());

-- vehicles
create policy "vehicles own or admin" on public.vehicles for select using (client_id = auth.uid() or is_admin());
create policy "vehicles own insert" on public.vehicles for insert with check (client_id = auth.uid());

-- orders
create policy "orders own or admin" on public.orders for select using (client_id = auth.uid() or is_admin());
create policy "orders own insert" on public.orders for insert with check (client_id = auth.uid());
create policy "orders admin update" on public.orders for update to authenticated using (is_admin()) with check (is_admin());
create policy "orders admin delete" on public.orders for delete to authenticated using (is_admin());

-- order_items
create policy "order items select own" on public.order_items for select to authenticated
  using (exists (select 1 from orders where orders.id = order_items.order_id and (orders.client_id = auth.uid() or is_admin())));
create policy "order items insert own" on public.order_items for insert to authenticated
  with check (exists (select 1 from orders where orders.id = order_items.order_id and orders.client_id = auth.uid()));
create policy "order_items admin delete" on public.order_items for delete to authenticated using (is_admin());

-- files
create policy "files visible by order owner or admin" on public.files for select
  using (exists (select 1 from orders o where o.id = files.order_id and (o.client_id = auth.uid() or is_admin())));
create policy "files insert authenticated" on public.files for insert to authenticated
  with check (
    uploaded_by = auth.uid() and (
      is_admin() or (
        file_type = 'original'
        and storage_path like auth.uid()::text || '/%'
        and exists (select 1 from orders o where o.id = files.order_id and o.client_id = auth.uid())
      )
    )
  );
create policy "admin atualiza arquivos" on public.files for update using (is_admin()) with check (is_admin());
create policy "files admin delete" on public.files for delete to authenticated using (is_admin());

-- download_logs (inserção normal é feita pela consume_file_download)
create policy "download visible" on public.download_logs for select using (user_id = auth.uid() or is_admin());
create policy "download own" on public.download_logs for insert with check (user_id = auth.uid());
create policy "download_logs admin delete" on public.download_logs for delete to authenticated using (is_admin());

-- messages
create policy "messages visible by client or admin" on public.messages for select using (client_id = auth.uid() or is_admin());
create policy "messages insert authenticated" on public.messages for insert with check (sender_id = auth.uid());
create policy "messages admin delete" on public.messages for delete to authenticated using (is_admin());

-- term_acceptances
create policy "usuario ve os proprios aceites ou admin ve todos" on public.term_acceptances for select
  using (user_id = auth.uid() or is_admin());
create policy "usuario registra o proprio aceite" on public.term_acceptances for insert with check (user_id = auth.uid());
create policy "term_acceptances admin delete" on public.term_acceptances for delete to authenticated using (is_admin());

-- activity_logs
create policy "admin ve logs" on public.activity_logs for select using (is_admin());
create policy "usuarios autenticados registram logs" on public.activity_logs for insert with check (auth.uid() is not null);
create policy "activity_logs admin delete" on public.activity_logs for delete to authenticated using (is_admin());

-- ---------------------------------------------------------------------------
-- STORAGE
-- ---------------------------------------------------------------------------
-- bucket ecu-files: privado, limite 100 MB, qualquer tipo de arquivo
-- bucket arquivos: legado (não usado pelo app), só admin
insert into storage.buckets (id, name, public, file_size_limit)
values ('ecu-files', 'ecu-files', false, 104857600), ('arquivos', 'arquivos', false, null)
on conflict (id) do nothing;

create policy "storage read own or admin" on storage.objects for select to authenticated
  using (
    bucket_id = 'ecu-files' and (
      is_admin() or exists (
        select 1 from files f join orders o on o.id = f.order_id
        where f.storage_path = objects.name
          and o.client_id = auth.uid()
          and (f.file_type = 'original' or f.download_unlocked_until > now())
      )
    )
  );
create policy "storage upload authenticated" on storage.objects for insert to authenticated
  with check (bucket_id = 'ecu-files' and (is_admin() or (storage.foldername(name))[1] = auth.uid()::text));
create policy "storage update admin" on storage.objects for update to authenticated
  using (bucket_id = 'ecu-files' and is_admin()) with check (bucket_id = 'ecu-files' and is_admin());
create policy "storage delete admin" on storage.objects for delete to authenticated
  using (bucket_id = 'ecu-files' and is_admin());
create policy "arquivos legado admin" on storage.objects for all to authenticated
  using (bucket_id = 'arquivos' and is_admin()) with check (bucket_id = 'arquivos' and is_admin());

-- ---------------------------------------------------------------------------
-- REALTIME (chat e notificações do admin)
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.orders, public.messages;
