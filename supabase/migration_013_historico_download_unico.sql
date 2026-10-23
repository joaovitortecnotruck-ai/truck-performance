-- ============================================================================
-- 013 — histórico de arquivos por veículo + download único + correções de RLS
-- ============================================================================

-- 1) Placa normalizada (maiúscula, só letras/números) para agrupar pedidos do mesmo carro
alter table public.vehicles
  add column if not exists plate_norm text
  generated always as (upper(regexp_replace(coalesce(plate, ''), '[^A-Za-z0-9]', '', 'g'))) stored;
create index if not exists vehicles_plate_norm_idx on public.vehicles (plate_norm);

-- 2) Controle de download único no arquivo final
alter table public.files
  add column if not exists downloads_allowed int not null default 1,
  add column if not exists downloads_used int not null default 0,
  add column if not exists download_unlocked_until timestamptz;

alter table public.download_logs add column if not exists user_agent text;

-- 3) Consome um download de forma atômica. Marca como baixado ANTES de liberar o link.
--    Retorna o storage_path; o storage só deixa o cliente ler o final dentro da janela de 60s.
create or replace function public.consume_file_download(p_file_id uuid, p_ip text, p_user_agent text)
returns text
language plpgsql
security definer
set search_path = public
as $$
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
revoke all on function public.consume_file_download(uuid, text, text) from public, anon;
grant execute on function public.consume_file_download(uuid, text, text) to authenticated;

-- 4) "Liberar novo download" (só admin)
create or replace function public.grant_extra_download(p_file_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'apenas admin';
  end if;
  update files set downloads_allowed = downloads_used + 1 where id = p_file_id;
end;
$$;
revoke all on function public.grant_extra_download(uuid) from public, anon;
grant execute on function public.grant_extra_download(uuid) to authenticated;

-- 5) Storage: cliente lê o próprio original sempre; o final só na janela liberada pelo RPC.
drop policy if exists "storage read own or admin" on storage.objects;
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

-- Upload: cliente só na própria pasta; admin em qualquer lugar. Sobrescrever/apagar: só admin.
drop policy if exists "storage upload authenticated" on storage.objects;
create policy "storage upload authenticated" on storage.objects for insert to authenticated
with check (bucket_id = 'ecu-files' and (is_admin() or (storage.foldername(name))[1] = auth.uid()::text));

drop policy if exists "storage update authenticated" on storage.objects;
create policy "storage update admin" on storage.objects for update to authenticated
using (bucket_id = 'ecu-files' and is_admin()) with check (bucket_id = 'ecu-files' and is_admin());

drop policy if exists "storage delete admin" on storage.objects;
create policy "storage delete admin" on storage.objects for delete to authenticated
using (bucket_id = 'ecu-files' and is_admin());

-- 6) files insert: cliente só "original" no próprio pedido e na própria pasta; admin qualquer.
drop policy if exists "files insert authenticated" on public.files;
create policy "files insert authenticated" on public.files for insert to authenticated
with check (
  uploaded_by = auth.uid() and (
    is_admin() or (
      file_type = 'original'
      and storage_path like auth.uid()::text || '/%'
      and exists (select 1 from orders o where o.id = order_id and o.client_id = auth.uid())
    )
  )
);
-- policy duplicada (a outra já cobre cliente + admin)
drop policy if exists "cliente ve arquivos dos proprios pedidos" on public.files;

-- Bucket legado "arquivos" (não usado pelo app): hoje qualquer logado lê arquivos de todos. Só admin.
drop policy if exists "usuarios autenticados 1dh1nqe_0" on storage.objects;
drop policy if exists "upload usuarios autenticados 1dh1nqe_0" on storage.objects;
create policy "arquivos legado admin" on storage.objects for all to authenticated
using (bucket_id = 'arquivos' and is_admin()) with check (bucket_id = 'arquivos' and is_admin());

-- 7) Apagar pedido apaga tudo ligado a ele (antes term_acceptances/download_logs travavam por FK)
alter table public.term_acceptances drop constraint if exists term_acceptances_order_id_fkey,
  add constraint term_acceptances_order_id_fkey foreign key (order_id) references public.orders(id) on delete cascade;
alter table public.download_logs drop constraint if exists download_logs_order_id_fkey,
  add constraint download_logs_order_id_fkey foreign key (order_id) references public.orders(id) on delete cascade;
alter table public.download_logs drop constraint if exists download_logs_file_id_fkey,
  add constraint download_logs_file_id_fkey foreign key (file_id) references public.files(id) on delete cascade;

-- Exclusão de pedido pelo admin (antes não existia policy de DELETE → excluir não fazia nada)
do $$
declare t text;
begin
  foreach t in array array['orders','files','order_items','messages','term_acceptances','activity_logs','download_logs'] loop
    execute format('drop policy if exists "%s admin delete" on public.%I', t, t);
    execute format('create policy "%s admin delete" on public.%I for delete to authenticated using (is_admin())', t, t);
  end loop;
end $$;
