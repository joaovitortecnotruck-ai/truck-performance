-- Adiciona uma coluna direta de client_id (sem precisar de sub-consulta na
-- tabela orders), pois políticas de RLS com JOIN/sub-consulta não funcionam
-- de forma confiável com o Realtime do Supabase para eventos postgres_changes.

alter table public.messages add column if not exists client_id uuid references public.profiles(id);

update public.messages m
set client_id = o.client_id
from public.orders o
where o.id = m.order_id and m.client_id is null;

drop policy if exists "messages visible by order" on public.messages;

create policy "messages visible by client or admin"
on public.messages for select
using (client_id = auth.uid() OR is_admin());
