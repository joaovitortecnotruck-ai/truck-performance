alter table public.orders add column if not exists payment_status text not null default 'pending';
