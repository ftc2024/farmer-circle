-- Farmer Circle Supabase Storage setup
-- Konsep final:
-- 1. Video pembelajaran dan PDF tetap dari Google Drive.
-- 2. Foto profile disimpan di Supabase Storage bucket profile-photos.
-- 3. Screenshot Daily Bias disimpan di Supabase Storage bucket daily-bias-screenshots.
-- 4. Jurnal Trade tidak memakai upload screenshot.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'profile-photos',
    'profile-photos',
    true,
    3145728,
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'daily-bias-screenshots',
    'daily-bias-screenshots',
    false,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp']
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Bersihkan policy lama jika pernah dibuat.
drop policy if exists "profile_photos_select_all" on storage.objects;
drop policy if exists "profile_photos_insert_own" on storage.objects;
drop policy if exists "profile_photos_update_own" on storage.objects;
drop policy if exists "profile_photos_delete_own" on storage.objects;
drop policy if exists "daily_bias_screenshots_select_authenticated" on storage.objects;
drop policy if exists "daily_bias_screenshots_insert_mentor_admin" on storage.objects;
drop policy if exists "daily_bias_screenshots_update_mentor_admin" on storage.objects;
drop policy if exists "daily_bias_screenshots_delete_mentor_admin" on storage.objects;

-- Foto profile public-read, tapi user hanya boleh tulis folder miliknya sendiri.
create policy "profile_photos_select_all"
on storage.objects
for select
to public
using (bucket_id = 'profile-photos');

create policy "profile_photos_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "profile_photos_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "profile_photos_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Screenshot Daily Bias private bucket.
-- Semua member login boleh baca, tapi hanya admin/mentor yang boleh upload/edit/hapus.
create policy "daily_bias_screenshots_select_authenticated"
on storage.objects
for select
to authenticated
using (bucket_id = 'daily-bias-screenshots');

create policy "daily_bias_screenshots_insert_mentor_admin"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'daily-bias-screenshots'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.role in ('admin', 'mentor')
  )
);

create policy "daily_bias_screenshots_update_mentor_admin"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'daily-bias-screenshots'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.role in ('admin', 'mentor')
  )
)
with check (
  bucket_id = 'daily-bias-screenshots'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.role in ('admin', 'mentor')
  )
);

create policy "daily_bias_screenshots_delete_mentor_admin"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'daily-bias-screenshots'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.role in ('admin', 'mentor')
  )
);
