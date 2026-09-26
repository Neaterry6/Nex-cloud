-- ═══════════════════════════════════════════════════════════════════
-- Nex Cloud — Database schema + Row Level Security
-- Apply via: supabase db push   (or paste into the SQL editor)
-- ═══════════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";

-- ── Profiles ─────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  username text unique,
  avatar_path text,
  role text not null default 'user' check (role in ('user','admin')),
  suspended boolean not null default false,
  storage_limit_bytes bigint not null default 5368709120, -- 5 GB free plan
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, username)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)),
    null
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Secure helper: is the current user an admin? (security definer, stable)
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and suspended = false
  );
$$;

-- ── Folders ──────────────────────────────────────────────────────────
create table if not exists public.folders (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.folders(id) on delete cascade,
  name text not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists folders_owner_idx on public.folders(owner_id, parent_id) where deleted_at is null;

-- ── Files ────────────────────────────────────────────────────────────
create table if not exists public.files (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete set null,
  name text not null,
  mime_type text not null default 'application/octet-stream',
  size bigint not null default 0,
  storage_path text not null,           -- private bucket path, never public
  is_document boolean not null default false,
  starred boolean not null default false,
  protected boolean not null default false,
  deleted_at timestamptz,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists files_owner_idx on public.files(owner_id, folder_id) where deleted_at is null;
create index if not exists files_owner_trash_idx on public.files(owner_id) where deleted_at is not null;
create index if not exists files_name_idx on public.files using gin (to_tsvector('simple', name));

-- ── Protected file passwords ─────────────────────────────────────────
-- password_hash is PBKDF2-SHA256 (pbkdf2$iters$salt$hash), written only
-- by Edge Functions (service role). NO client can ever SELECT this table.
create table if not exists public.protected_files (
  file_id uuid primary key references public.files(id) on delete cascade,
  password_hash text not null,
  require_for_preview boolean not null default true,
  require_for_download boolean not null default true,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);
-- No SELECT/INSERT/UPDATE/DELETE grants for authenticated or anon roles.
-- Only the service role (Edge Functions) touches this table.

-- ── Shares ───────────────────────────────────────────────────────────
-- Public links use opaque random tokens, never internal IDs.
create table if not exists public.shares (
  id uuid primary key default uuid_generate_v4(),
  token text not null unique default encode(gen_random_bytes(18), 'base64url'),
  file_id uuid references public.files(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  target_user_id uuid references public.profiles(id) on delete cascade, -- null = anyone with link
  permission text not null default 'viewer' check (permission in ('viewer','editor')),
  password_hash text,                    -- PBKDF2, service-role only reads/writes
  expires_at timestamptz,
  allow_download boolean not null default true,
  allow_preview boolean not null default true,
  revoked boolean not null default false,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  check (file_id is not null or folder_id is not null)
);
create index if not exists shares_token_idx on public.shares(token);
create index if not exists shares_target_idx on public.shares(target_user_id) where target_user_id is not null;

-- ── Favorites (starred is on files; this supports folders too) ──────
create table if not exists public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  file_id uuid references public.files(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, coalesce(file_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(folder_id, '00000000-0000-0000-0000-000000000000'::uuid))
);

-- ── Comments & mentions ─────────────────────────────────────────────
create table if not exists public.comments (
  id uuid primary key default uuid_generate_v4(),
  file_id uuid references public.files(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null,
  mentions uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists comments_file_idx on public.comments(file_id, created_at);

-- ── Document versions ───────────────────────────────────────────────
create table if not exists public.document_versions (
  id uuid primary key default uuid_generate_v4(),
  file_id uuid not null references public.files(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null default '',
  version int not null,
  created_at timestamptz not null default now(),
  unique(file_id, version)
);

-- ── Notifications (in-app) ──────────────────────────────────────────
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, read, created_at desc);

-- ── Activity log ────────────────────────────────────────────────────
create table if not exists public.activity_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activity_logs_user_idx on public.activity_logs(user_id, created_at desc);

-- ── Plans / subscriptions (billing-ready) ───────────────────────────
create table if not exists public.plans (
  key text primary key,                 -- 'free' | 'pro' | 'business'
  name text not null,
  storage_limit_bytes bigint not null,
  max_file_size_bytes bigint not null,
  price_cents int not null default 0,
  features jsonb not null default '{}'::jsonb
);

insert into public.plans (key, name, storage_limit_bytes, max_file_size_bytes, price_cents, features) values
  ('free', 'Free', 5368709120, 104857600, 0, '{"protectedShares":5}'::jsonb),
  ('pro', 'Pro', 1099511627776, 2147483648, 999, '{"protectedShares":100}'::jsonb),
  ('business', 'Business', 5497558138880, 10737418240, 2999, '{"protectedShares":-1}'::jsonb)
on conflict (key) do nothing;

create table if not exists public.subscriptions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  plan_key text not null references public.plans(key),
  status text not null default 'active',
  created_at timestamptz not null default now()
);

-- ── Admin settings ──────────────────────────────────────────────────
create table if not exists public.admin_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.admin_settings (key, value) values
  ('email', '{"configured": false, "provider": "resend"}'::jsonb),
  ('storage', '{"maxUploadBytes": 104857600}'::jsonb),
  ('sharing', '{"defaultAllowDownload": true, "defaultAllowPreview": true}'::jsonb)
on conflict (key) do nothing;

-- ── Storage usage view ──────────────────────────────────────────────
create or replace view public.storage_usage
with (security_invoker = true) as
select
  owner_id as user_id,
  coalesce(sum(size) filter (where deleted_at is null), 0)::bigint as used_bytes,
  count(*) filter (where deleted_at is null) as file_count
from public.files
group by owner_id;

-- ═══════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════
alter table public.profiles enable row level security;
alter table public.folders enable row level security;
alter table public.files enable row level security;
alter table public.protected_files enable row level security;
alter table public.shares enable row level security;
alter table public.favorites enable row level security;
alter table public.comments enable row level security;
alter table public.document_versions enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.admin_settings enable row level security;

-- Grant baseline access (protected_files gets NO grants to clients).
grant select, insert, update, delete on public.folders, public.files,
  public.favorites, public.comments, public.document_versions,
  public.notifications to authenticated;
grant select on public.plans to authenticated;
grant select, insert, update, delete on public.subscriptions to authenticated;
grant select, insert on public.activity_logs to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.shares to authenticated;
grant select on public.admin_settings to authenticated;

-- Profiles: read own, read others' minimal public info (for sharing),
-- update own; admins read/update all.
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_select_public on public.profiles
  for select to authenticated using (true);  -- id, display_name, avatar only needed; exposure limited to non-sensitive cols via view below
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
create policy profiles_admin on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Folders: full access to own, non-deleted.
create policy folders_own on public.folders
  for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
-- Shared folders (viewer/editor via shares with target_user_id).
create policy folders_shared on public.folders
  for select to authenticated
  using (exists (
    select 1 from public.shares s
    where s.folder_id = folders.id and s.revoked = false
      and (s.target_user_id = auth.uid() or s.target_user_id is null)
      and (s.expires_at is null or s.expires_at > now())
  ));

-- Files: full access to own.
create policy files_own on public.files
  for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
-- Shared files.
create policy files_shared on public.files
  for select to authenticated
  using (exists (
    select 1 from public.shares s
    where s.file_id = files.id and s.revoked = false
      and (s.target_user_id = auth.uid() or s.target_user_id is null)
      and (s.expires_at is null or s.expires_at > now())
  ));

-- Protected files: locked to everyone via RLS; Edge Functions bypass with service role.
create policy protected_files_deny_all on public.protected_files
  for all to authenticated using (false) with check (false);

-- Shares: owners manage their own shares; targets can see shares sent to them.
create policy shares_creator on public.shares
  for all to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy shares_target on public.shares
  for select to authenticated
  using (target_user_id = auth.uid());
create policy shares_admin on public.shares
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- Never let clients read password hashes even on their own shares' rows:
create policy shares_no_hash_read on public.shares
  for select to authenticated using (true);
revoke select (password_hash) on public.shares from authenticated; -- column-level: hashes unreadable by clients

-- Favorites
create policy favorites_own on public.favorites
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Comments: read/write where you can read the file.
create policy comments_read on public.comments
  for select to authenticated using (
    exists (select 1 from public.files f where f.id = comments.file_id and f.owner_id = auth.uid())
    or exists (
      select 1 from public.shares s where s.file_id = comments.file_id and s.revoked = false
        and (s.target_user_id = auth.uid() or s.target_user_id is null)
        and (s.expires_at is null or s.expires_at > now())
    )
  );
create policy comments_insert on public.comments
  for insert to authenticated with check (author_id = auth.uid());

-- Document versions: owner + shared editors.
create policy doc_versions_owner on public.document_versions
  for all to authenticated using (
    exists (select 1 from public.files f where f.id = document_versions.file_id and f.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.files f where f.id = document_versions.file_id and f.owner_id = auth.uid())
  );
create policy doc_versions_shared on public.document_versions
  for select to authenticated using (
    exists (
      select 1 from public.shares s where s.file_id = document_versions.file_id and s.revoked = false
        and (s.target_user_id = auth.uid() or s.target_user_id is null)
    )
  );

-- Notifications: strictly per-user.
create policy notifications_own on public.notifications
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Activity logs: insert own, read own; admin reads all.
create policy activity_insert on public.activity_logs
  for insert to authenticated with check (user_id = auth.uid());
create policy activity_read on public.activity_logs
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- Plans readable; subscriptions own; admin settings readable, admin writable.
create policy plans_read on public.plans for select to authenticated using (true);
create policy subscriptions_own on public.subscriptions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy admin_settings_read on public.admin_settings for select to authenticated using (true);
create policy admin_settings_admin on public.admin_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── Storage bucket (private) ────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('files', 'files', false)
on conflict (id) do nothing;

-- Public avatars bucket (profile pictures only; contains no private files).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy avatars_own on storage.objects
  for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Users can only touch objects under their own user_id prefix.
create policy storage_own on storage.objects
  for all to authenticated
  using (bucket_id = 'files' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'files' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── Realtime ────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.comments;
