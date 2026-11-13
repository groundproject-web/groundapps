-- Contas de demonstração (Carla, João, sócio). Login sem senha só fora de produção.
create table public.demo_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  label text not null
);
alter table public.demo_accounts enable row level security;
-- sem policy: só o servidor (service) lê

grant all on public.demo_accounts to service_role;
