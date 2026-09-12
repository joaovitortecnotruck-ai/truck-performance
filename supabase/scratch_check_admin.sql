select enumlabel from pg_enum where enumtypid = (select oid from pg_type where typname = (select udt_name from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='role'));

select tablename, policyname, cmd, qual
from pg_policies
where schemaname = 'public' and tablename in ('orders','vehicles','files','profiles','order_items')
order by tablename, policyname;
