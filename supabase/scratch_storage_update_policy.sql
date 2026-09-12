create policy "storage update authenticated"
on storage.objects for update
using (bucket_id = 'ecu-files' and auth.uid() is not null)
with check (bucket_id = 'ecu-files' and auth.uid() is not null);
