-- =====================================================================
-- Núcleo da plataforma: organizações, membros, entitlements, dados da loja,
-- eventos internos. Toda tabela com dado de loja tem RLS por organization_id.
-- Dados pessoais (e-mail/telefone) ficam criptografados pela aplicação
-- (AES-256-GCM); aqui só existem o texto cifrado e um hash para casar cadastros.
-- =====================================================================

-- gen_random_uuid() é nativo do Postgres 13+; não precisa de extensão.

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_display_name text not null default '',
  segment text not null default '',
  store_url text,
  is_demo boolean not null default false,
  -- relógio da organização: só demo/staging usa (botão "avançar uma semana")
  clock_date date,
  deletion_requested_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index memberships_user_idx on public.memberships(user_id);

-- Sócios da Ground (acesso ao /admin)
create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.entitlements (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  module text not null check (module in ('marco_zero', 'sketch')),
  plan text not null,
  status text not null default 'ativo' check (status in ('ativo', 'carencia', 'cancelado')),
  source text not null default 'manual' check (source in ('manual', 'gateway')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (organization_id, module)
);

-- ---------- funções de acesso (a checagem fica num lugar só) ----------
create or replace function public.is_member(org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.memberships m where m.organization_id = org and m.user_id = auth.uid())
$$;

create or replace function public.is_platform_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.platform_admins a where a.user_id = auth.uid())
$$;

create or replace function public.has_module(org uuid, mod text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.entitlements e where e.organization_id = org and e.module = mod and e.status in ('ativo', 'carencia'))
$$;

-- Um módulo só enxerga o outro quando as DUAS assinaturas estão ativas.
create or replace function public.integration_enabled(org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.has_module(org, 'marco_zero') and public.has_module(org, 'sketch')
$$;

-- ---------- dados da loja ----------
create table public.data_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null check (kind in ('planilha', 'nuvemshop', 'shopify', 'demo')),
  status text not null default 'ativo',
  -- referência ao segredo no cofre (Supabase Vault); o token NUNCA fica aqui
  secret_ref text,
  config jsonb not null default '{}'::jsonb,
  last_sync_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.imports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  data_source_id uuid references public.data_sources(id) on delete set null,
  filename text,
  status text not null default 'organizando' check (status in ('organizando', 'aguardando_confirmacao', 'concluido', 'erro')),
  mapping jsonb not null default '[]'::jsonb,
  stats jsonb not null default '{}'::jsonb,
  doubts jsonb not null default '[]'::jsonb,
  decisions jsonb not null default '{}'::jsonb,
  problems jsonb not null default '[]'::jsonb,
  -- linhas já normalizadas (sem CPF/endereço), cifradas, só até o lojista confirmar as dúvidas
  staged_enc text,
  -- base grande ou bagunçada: organização cobrada à parte (valor no /admin)
  organization_fee_flag boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.customers (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  id text not null,
  name text not null,
  email_enc text,
  phone_enc text,
  email_hash text,
  phone_hash text,
  created_at timestamptz not null default now(),
  primary key (organization_id, id)
);
create index customers_phone_hash_idx on public.customers(organization_id, phone_hash);

create table public.products (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  id text not null,
  name text not null,
  primary key (organization_id, id),
  unique (organization_id, name)
);

create table public.orders (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  id text not null,
  customer_id text not null,
  ordered_at date not null,
  total_cents integer not null check (total_cents >= 0),
  coupon text,
  source_code text,
  is_simulated boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (organization_id, id),
  foreign key (organization_id, customer_id) references public.customers(organization_id, id) on delete cascade
);
create index orders_customer_idx on public.orders(organization_id, customer_id, ordered_at);
create index orders_date_idx on public.orders(organization_id, ordered_at);

create table public.order_items (
  organization_id uuid not null,
  order_id text not null,
  product_id text not null,
  quantity integer not null default 1,
  primary key (organization_id, order_id, product_id),
  foreign key (organization_id, order_id) references public.orders(organization_id, id) on delete cascade,
  foreign key (organization_id, product_id) references public.products(organization_id, id) on delete cascade
);

-- core.order.attributed_source: um pedido é atribuído UMA vez só
create table public.order_source_attributions (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id text not null,
  source_code text not null,
  created_at timestamptz not null default now(),
  primary key (organization_id, order_id)
);

-- ---------- eventos internos ----------
create table public.domain_events (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  type text not null,
  idempotency_key text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (organization_id, type, idempotency_key)
);

create table public.event_consumptions (
  consumer text not null,
  event_id text not null references public.domain_events(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  processed_at timestamptz not null default now(),
  primary key (consumer, event_id)
);

-- ---------- custo de IA por organização ----------
create table public.ai_usage (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id) on delete set null,
  feature text not null,
  prompt_version text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd_micros bigint not null default 0,
  offline boolean not null default false,
  created_at timestamptz not null default now()
);
create index ai_usage_org_idx on public.ai_usage(organization_id, created_at);

-- ---------- sugestões (uma vez por gatilho) ----------
create table public.suggestion_memory (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  key text not null,
  shown_at date,
  dismissed_at date,
  accepted_at date,
  primary key (organization_id, key)
);

-- ---------- conversa com a Ground / gargalo estrutural ----------
create table public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  module text not null,
  topic text not null,
  message text not null default '',
  status text not null default 'novo' check (status in ('novo', 'em_conversa', 'encerrado')),
  created_at timestamptz not null default now()
);

create table public.structural_alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  module text not null,
  signal_type text not null,
  weeks jsonb not null,
  status text not null default 'aberto',
  created_at timestamptz not null default now(),
  unique (organization_id, module, signal_type, weeks)
);

-- ---------- RLS ----------
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.platform_admins enable row level security;
alter table public.entitlements enable row level security;
alter table public.data_sources enable row level security;
alter table public.imports enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_source_attributions enable row level security;
alter table public.domain_events enable row level security;
alter table public.event_consumptions enable row level security;
alter table public.ai_usage enable row level security;
alter table public.suggestion_memory enable row level security;
alter table public.contact_requests enable row level security;
alter table public.structural_alerts enable row level security;

create policy org_read on public.organizations for select to authenticated using (public.is_member(id) or public.is_platform_admin());
create policy org_update on public.organizations for update to authenticated using (public.is_member(id)) with check (public.is_member(id));

create policy mem_read on public.memberships for select to authenticated using (user_id = auth.uid() or public.is_member(organization_id) or public.is_platform_admin());

create policy admins_read on public.platform_admins for select to authenticated using (user_id = auth.uid());

-- entitlements: o lojista lê; só a Ground (admin/serviço) altera
create policy ent_read on public.entitlements for select to authenticated using (public.is_member(organization_id) or public.is_platform_admin());
create policy ent_admin_write on public.entitlements for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

-- dados da loja: membros da organização
do $$
declare t text;
begin
  foreach t in array array['data_sources','imports','customers','products','orders','order_items','suggestion_memory'] loop
    execute format('create policy %I on public.%I for all to authenticated using (public.is_member(organization_id)) with check (public.is_member(organization_id))', t || '_member', t);
  end loop;
end $$;

-- atribuição de origem: só existe quando os dois módulos estão ativos
create policy osa_member on public.order_source_attributions for all to authenticated
  using (public.is_member(organization_id) and public.integration_enabled(organization_id))
  with check (public.is_member(organization_id) and public.integration_enabled(organization_id));

-- eventos: leitura pelos membros; escrita só pelo servidor (service_role)
create policy ev_read on public.domain_events for select to authenticated using (public.is_member(organization_id));
create policy evc_read on public.event_consumptions for select to authenticated using (public.is_member(organization_id));

-- custo de IA: só a Ground vê
create policy ai_admin on public.ai_usage for select to authenticated using (public.is_platform_admin());

create policy cr_member on public.contact_requests for insert to authenticated with check (public.is_member(organization_id));
create policy cr_read on public.contact_requests for select to authenticated using (public.is_member(organization_id) or public.is_platform_admin());
create policy cr_admin on public.contact_requests for update to authenticated using (public.is_platform_admin());
create policy sa_read on public.structural_alerts for select to authenticated using (public.is_member(organization_id) or public.is_platform_admin());

grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant execute on all functions in schema public to authenticated, service_role;
