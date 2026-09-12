create policy "admin atualiza qualquer perfil"
on public.profiles for update
using (is_admin())
with check (is_admin());
