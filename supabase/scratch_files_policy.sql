-- Permite que o cliente veja os arquivos dos PRÓPRIOS pedidos
-- (a tabela files tinha RLS ativado mas sem política de leitura para o cliente)
create policy "cliente ve arquivos dos proprios pedidos"
  on public.files for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = files.order_id
        and o.client_id = auth.uid()
    )
  );
