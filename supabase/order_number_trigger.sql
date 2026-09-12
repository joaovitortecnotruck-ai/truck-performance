-- Gera automaticamente o order_number no formato já usado nos pedidos reais
-- (TP- + 6 dígitos), toda vez que um pedido é inserido sem esse campo.

create or replace function public.set_order_number()
returns trigger
language plpgsql
as $$
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

drop trigger if exists trg_set_order_number on public.orders;
create trigger trg_set_order_number
  before insert on public.orders
  for each row execute function public.set_order_number();
