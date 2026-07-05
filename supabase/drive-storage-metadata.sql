-- Farmer Circle Google Drive storage metadata
-- Jalankan di Supabase SQL Editor setelah profile migration.
-- File fisik disimpan di Google Drive, Supabase hanya menyimpan metadata/link/file_id.

create table if not exists public.drive_folders (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete cascade,
  folder_type text not null check (folder_type in (
    'root',
    'profile_photos',
    'daily_bias_screenshots',
    'analysis_screenshots',
    'learning_videos',
    'learning_pdfs'
  )),
  drive_folder_id text not null,
  drive_folder_name text,
  parent_drive_folder_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (owner_user_id, folder_type),
  unique (drive_folder_id)
);

create table if not exists public.drive_files (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete set null,
  uploaded_by uuid references auth.users(id) on delete set null,
  folder_type text not null check (folder_type in (
    'profile_photos',
    'daily_bias_screenshots',
    'analysis_screenshots',
    'learning_videos',
    'learning_pdfs'
  )),
  related_table text,
  related_id uuid,
  title text,
  original_filename text,
  mime_type text,
  file_size_bytes bigint,
  drive_file_id text not null unique,
  drive_folder_id text,
  web_view_link text,
  web_content_link text,
  thumbnail_link text,
  visibility text not null default 'private' check (visibility in ('private', 'member', 'public')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists drive_files_owner_idx on public.drive_files(owner_user_id);
create index if not exists drive_files_folder_type_idx on public.drive_files(folder_type);
create index if not exists drive_files_related_idx on public.drive_files(related_table, related_id);

create or replace function public.set_drive_storage_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_drive_folders_updated_at on public.drive_folders;
create trigger set_drive_folders_updated_at
before update on public.drive_folders
for each row execute function public.set_drive_storage_updated_at();

drop trigger if exists set_drive_files_updated_at on public.drive_files;
create trigger set_drive_files_updated_at
before update on public.drive_files
for each row execute function public.set_drive_storage_updated_at();

alter table public.drive_folders enable row level security;
alter table public.drive_files enable row level security;

-- Member hanya bisa melihat folder miliknya sendiri. Folder learning global owner_user_id boleh null.
drop policy if exists "drive_folders_select_own_or_global" on public.drive_folders;
create policy "drive_folders_select_own_or_global"
on public.drive_folders
for select
to authenticated
using (owner_user_id = auth.uid() or owner_user_id is null);

-- Member hanya bisa melihat file miliknya sendiri, atau file learning/member/public.
drop policy if exists "drive_files_select_allowed" on public.drive_files;
create policy "drive_files_select_allowed"
on public.drive_files
for select
to authenticated
using (
  owner_user_id = auth.uid()
  or visibility in ('member', 'public')
  or folder_type in ('learning_videos', 'learning_pdfs')
);

-- Insert/update/delete metadata sebaiknya dilakukan backend/service-role.
-- Policy insert/update berikut hanya untuk fallback jika nanti perlu upload metadata dari client.
drop policy if exists "drive_files_insert_own" on public.drive_files;
create policy "drive_files_insert_own"
on public.drive_files
for insert
to authenticated
with check (owner_user_id = auth.uid() and uploaded_by = auth.uid());

drop policy if exists "drive_files_update_own" on public.drive_files;
create policy "drive_files_update_own"
on public.drive_files
for update
to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());
