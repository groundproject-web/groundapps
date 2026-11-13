-- SÓ PARA AMBIENTE LOCAL (PGlite). No Supabase, isto já existe.
-- Reproduz o mínimo do Supabase: papéis, schema auth, auth.uid() e auth.users.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key,
  email text unique,
  created_at timestamptz not null default now()
);

create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;

-- Login local (não existe no Supabase: lá é o Supabase Auth)
create table if not exists public.local_credentials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  password_hash text not null
);
