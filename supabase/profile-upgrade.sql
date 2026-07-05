-- Farmer Circle profile upgrade
-- Jalankan script ini di Supabase SQL Editor.
-- Tujuan: menyimpan detail profile member di public.profiles, bukan hanya di auth user_metadata.

alter table public.profiles
  add column if not exists phone text,
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists bio text,
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists country text,
  add column if not exists avatar_url text,
  add column if not exists avatar_path text,
  add column if not exists updated_at timestamptz default now();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- Pastikan Row Level Security aktif.
alter table public.profiles enable row level security;

-- Policy aman per member: user hanya bisa lihat dan ubah profile miliknya sendiri.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);
