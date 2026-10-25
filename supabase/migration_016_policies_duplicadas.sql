-- 016 — remove regras de acesso repetidas (as equivalentes continuam; ver schema.sql)
drop policy if exists "accept own" on public.term_acceptances;      -- = "usuario registra o proprio aceite"
drop policy if exists "accept visible" on public.term_acceptances;  -- = "usuario ve os proprios aceites ou admin ve todos"
drop policy if exists "Authenticated users can read active terms" on public.terms; -- = "usuarios autenticados leem termos ativos"
