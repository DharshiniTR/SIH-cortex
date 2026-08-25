-- Run this in the Supabase SQL Editor for the DigiLocker project.
-- The extension expects a bucket named "documents".

insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do update set public = excluded.public;

-- Files are stored under: <authenticated-user-id>/<generated-filename>
drop policy if exists "DigiLocker users can upload their own documents" on storage.objects;
create policy "DigiLocker users can upload their own documents"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "DigiLocker users can update their own documents" on storage.objects;
create policy "DigiLocker users can update their own documents"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'documents'
  and owner_id = (select auth.uid()::text)
)
with check (
  bucket_id = 'documents'
  and owner_id = (select auth.uid()::text)
);

drop policy if exists "DigiLocker users can delete their own documents" on storage.objects;
create policy "DigiLocker users can delete their own documents"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'documents'
  and owner_id = (select auth.uid()::text)
);

-- The existing docs table should already have RLS configured by the DigiLocker app.
-- If it does not, enable it and allow users to manage only their own email rows.
alter table public.docs enable row level security;

drop policy if exists "DigiLocker users can insert their own docs" on public.docs;
create policy "DigiLocker users can insert their own docs"
on public.docs
for insert
to authenticated
with check (email = (select auth.jwt()->>'email'));

drop policy if exists "DigiLocker users can read their own docs" on public.docs;
create policy "DigiLocker users can read their own docs"
on public.docs
for select
to authenticated
using (email = (select auth.jwt()->>'email'));