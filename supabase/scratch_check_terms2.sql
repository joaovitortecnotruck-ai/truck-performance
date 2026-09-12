select table_name, column_name
from information_schema.columns
where table_schema = 'public' and table_name in ('term_acceptances', 'terms')
order by table_name, ordinal_position;
