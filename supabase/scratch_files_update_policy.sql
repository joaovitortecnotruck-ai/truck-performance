create policy "admin atualiza arquivos"
on public.files for update
using (is_admin())
with check (is_admin());
