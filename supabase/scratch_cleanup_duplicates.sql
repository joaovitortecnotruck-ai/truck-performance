delete from public.files
where order_id = 'f3cc5be7-ba48-4077-b4a8-b13609f8d6b4'
  and file_type = 'final'
  and id not in (
    select id from public.files
    where order_id = 'f3cc5be7-ba48-4077-b4a8-b13609f8d6b4' and file_type = 'final'
    order by created_at desc
    limit 1
  );
