-- ══════════════════════════════════════════════════════════════
--  AHORRA 360 — Schema Supabase
--  Ejecuta este SQL en Supabase: Dashboard → SQL Editor → Run
-- ══════════════════════════════════════════════════════════════

-- ── 1. PROFILES (extensión de auth.users) ─────────────────────
create table if not exists public.profiles (
  id         uuid references auth.users(id) on delete cascade primary key,
  name       text,
  avatar_url text,
  created_at timestamptz default now() not null
);

-- Crear perfil automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 2. HOGARES ─────────────────────────────────────────────────
create table if not exists public.hogares (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  name       text not null,
  cp         text,
  created_at timestamptz default now() not null
);

-- ── 3. BILLS (facturas analizadas) ────────────────────────────
create table if not exists public.bills (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  hogar_id      uuid references public.hogares(id) on delete set null,
  vertical      text not null check (vertical in ('luz','gas','telecos','combustible','seguros')),
  provider_name text,
  amount        numeric(10,2),
  billing_date  date,
  status        text default 'analizado' check (status in ('procesando','analizado','alerta')),
  ai_lines      jsonb,
  ai_recs       jsonb,
  ai_saving     integer default 0,
  chat_context  text,
  file_url      text,
  created_at    timestamptz default now() not null
);

-- ── 4. ROW LEVEL SECURITY (RLS) ───────────────────────────────
alter table public.profiles enable row level security;
alter table public.hogares enable row level security;
alter table public.bills enable row level security;

-- Policies: cada usuario solo ve sus propios datos
create policy "profiles: own data" on public.profiles
  for all using (auth.uid() = id);

create policy "hogares: own data" on public.hogares
  for all using (auth.uid() = user_id);

create policy "bills: own data" on public.bills
  for all using (auth.uid() = user_id);

-- ── 5. STORAGE BUCKET ─────────────────────────────────────────
-- Ir a Supabase Dashboard → Storage → New bucket:
-- Nombre: "bills"
-- Public: NO (privado)
-- Luego añadir esta policy en Storage → Policies:

-- insert into storage.buckets (id, name, public) values ('bills', 'bills', false);

-- Policy de storage (ejecutar en SQL Editor):
-- create policy "users upload own bills" on storage.objects
--   for insert with check (auth.uid()::text = (storage.foldername(name))[1]);
-- create policy "users read own bills" on storage.objects
--   for select using (auth.uid()::text = (storage.foldername(name))[1]);

-- ── VERIFICACIÓN ──────────────────────────────────────────────
-- Después de ejecutar, verifica en Table Editor que existen:
-- ✅ profiles  ✅ hogares  ✅ bills
