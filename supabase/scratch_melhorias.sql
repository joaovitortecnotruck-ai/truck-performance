-- ============================================================
-- 1) Termo de emissões (faltava cadastrar) + permissões da tabela terms
-- ============================================================
create policy "admin gerencia termos"
on public.terms for all
using (is_admin())
with check (is_admin());

create policy "usuarios autenticados leem termos ativos"
on public.terms for select
using (active = true);

insert into public.terms (code, version, title, body, active)
select
  'EMISSIONS',
  '1.0',
  'Termo de Sistemas de Emissões',
  'Alterações relacionadas aos sistemas de controle de emissões (EGR/DPF/SCR/ARLA) podem possuir restrições legais para utilização em veículos destinados à circulação em vias públicas. Os serviços desta área são destinados exclusivamente a aplicações permitidas — competição, desenvolvimento, testes, exportação ou uso fora de vias públicas, conforme legislação aplicável.',
  true
where not exists (select 1 from public.terms where code = 'EMISSIONS');

-- ============================================================
-- 2) Permissões da tabela term_acceptances (registro de aceite)
-- ============================================================
alter table public.term_acceptances enable row level security;

create policy "usuario registra o proprio aceite"
on public.term_acceptances for insert
with check (user_id = auth.uid());

create policy "usuario ve os proprios aceites ou admin ve todos"
on public.term_acceptances for select
using (user_id = auth.uid() or is_admin());

-- ============================================================
-- 3) Tabela de log de atividades (auditoria)
-- ============================================================
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  action text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

alter table public.activity_logs enable row level security;

create policy "admin ve logs"
on public.activity_logs for select
using (is_admin());

create policy "usuarios autenticados registram logs"
on public.activity_logs for insert
with check (auth.uid() is not null);
