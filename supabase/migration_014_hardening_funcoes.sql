-- 014 — recomendações do Security Advisor do Supabase (não aplicada ainda)
-- Funções de trigger não precisam ser chamáveis pela API (/rest/v1/rpc/...).
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
alter function public.set_order_number() set search_path = public;
