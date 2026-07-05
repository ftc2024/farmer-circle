-- Farmer Circle profile metadata sync
-- Jalankan setelah supabase/profile-upgrade.sql.
-- Tujuan: setiap member klik Simpan Profil di website,
-- data dari auth.users.raw_user_meta_data otomatis disalin ke public.profiles.

create or replace function public.sync_profile_from_auth_metadata()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    phone,
    first_name,
    last_name,
    bio,
    address,
    city,
    country,
    avatar_url,
    avatar_path,
    updated_at
  ) values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'bio',
    new.raw_user_meta_data ->> 'address',
    new.raw_user_meta_data ->> 'city',
    new.raw_user_meta_data ->> 'country',
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_user_meta_data ->> 'avatar_path',
    now()
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    phone = excluded.phone,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    bio = excluded.bio,
    address = excluded.address,
    city = excluded.city,
    country = excluded.country,
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    avatar_path = coalesce(excluded.avatar_path, public.profiles.avatar_path),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists sync_profile_from_auth_metadata on auth.users;
create trigger sync_profile_from_auth_metadata
after insert or update of raw_user_meta_data on auth.users
for each row
execute function public.sync_profile_from_auth_metadata();

-- Optional one-time backfill untuk user lama yang sudah punya metadata.
insert into public.profiles (
  id,
  full_name,
  phone,
  first_name,
  last_name,
  bio,
  address,
  city,
  country,
  avatar_url,
  avatar_path,
  updated_at
)
select
  id,
  coalesce(raw_user_meta_data ->> 'full_name', split_part(email, '@', 1)),
  raw_user_meta_data ->> 'phone',
  raw_user_meta_data ->> 'first_name',
  raw_user_meta_data ->> 'last_name',
  raw_user_meta_data ->> 'bio',
  raw_user_meta_data ->> 'address',
  raw_user_meta_data ->> 'city',
  raw_user_meta_data ->> 'country',
  raw_user_meta_data ->> 'avatar_url',
  raw_user_meta_data ->> 'avatar_path',
  now()
from auth.users
on conflict (id) do update set
  full_name = excluded.full_name,
  phone = excluded.phone,
  first_name = excluded.first_name,
  last_name = excluded.last_name,
  bio = excluded.bio,
  address = excluded.address,
  city = excluded.city,
  country = excluded.country,
  avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
  avatar_path = coalesce(excluded.avatar_path, public.profiles.avatar_path),
  updated_at = now();
