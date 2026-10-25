-- 015 — cliente não pode mudar o próprio papel (antes: "profile own update" deixava virar admin)
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() nulo = SQL Editor / backend; aí pode
  if new.role is distinct from old.role and auth.uid() is not null and not is_admin() then
    raise exception 'apenas admin pode alterar o papel do usuario';
  end if;
  return new;
end;
$$;
revoke execute on function public.protect_profile_role() from public, anon, authenticated;

drop trigger if exists trg_protect_profile_role on public.profiles;
create trigger trg_protect_profile_role before update on public.profiles
  for each row execute function public.protect_profile_role();

drop policy if exists "profile own update" on public.profiles;
create policy "profile own update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

revoke execute on function public.set_order_number() from public, anon, authenticated;
