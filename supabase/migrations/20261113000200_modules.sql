-- =====================================================================
-- Módulos: Marco Zero (missões, check-in, resultado, aprendizados),
-- Sketch (perfil, fontes, missões, códigos de origem) e cobrança.
-- Cada módulo só é visível com o entitlement ativo (has_module).
-- =====================================================================

-- ---------- Marco Zero ----------
create table public.mz_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  attribution_window_days integer,
  control_group_pct numeric,
  billed_tier text,
  tier_state jsonb not null default '{"kind":"ok"}'::jsonb,
  checkin_upload_retention_days integer not null default 30,
  updated_at timestamptz not null default now()
);

create table public.mz_missions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  week_start date not null,
  status text not null default 'aberta' check (status in ('aberta', 'fechada')),
  plan jsonb not null,
  message_override text,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  unique (organization_id, week_start)
);

-- O que o lojista conta: guardado como HIPÓTESE
create table public.mz_checkins (
  mission_id uuid primary key references public.mz_missions(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  answers jsonb not null,
  status text not null default 'hipotese' check (status = 'hipotese'),
  created_at timestamptz not null default now()
);

-- O que a loja mostra: FATO (quando a comparação é válida)
create table public.mz_results (
  mission_id uuid primary key references public.mz_missions(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  result jsonb not null,
  created_at timestamptz not null default now()
);

create table public.learnings (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  key text not null,
  module text not null default 'marco_zero',
  sentence text not null,
  kind text not null,
  state text not null check (state in ('fato', 'hipotese', 'ajustado', 'descartado', 'sem_info')),
  successes integer not null default 0,
  failures integer not null default 0,
  recurrence integer not null default 0,
  evidence_mission_ids jsonb not null default '[]'::jsonb,
  history jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (organization_id, key)
);

create table public.weekly_signals (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  module text not null,
  week date not null,
  signal_type text not null,
  primary key (organization_id, module, week, signal_type)
);

-- Prints/áudios do check-in: extrai o conteúdo e apaga o arquivo depois de N dias
create table public.checkin_uploads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  mission_id uuid references public.mz_missions(id) on delete cascade,
  kind text not null check (kind in ('imagem', 'audio', 'texto')),
  storage_path text,
  summary jsonb,
  delete_after date not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

-- Fechamento semanal idempotente (cron)
create table public.job_runs (
  job text not null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  run_key text not null,
  status text not null default 'ok',
  detail jsonb,
  created_at timestamptz not null default now(),
  primary key (job, organization_id, run_key)
);

create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  to_user uuid references auth.users(id) on delete cascade,
  kind text not null,
  subject text not null,
  body text not null,
  dedupe_key text not null unique,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- Sketch ----------
create table public.sketch_profiles (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  path smallint not null check (path in (1, 2)),
  data jsonb not null,
  research_read_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Fontes lidas (avaliações, comentários, páginas). Sem nome de quem escreveu.
create table public.sketch_sources (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  id text not null,
  kind text not null,
  url text,
  text text not null,
  collected_at timestamptz not null,
  primary key (organization_id, id)
);

create table public.sketch_messages (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sender text not null check (sender in ('app', 'lojista')),
  kind text not null check (kind in ('texto', 'audio', 'imagem')),
  content jsonb not null,
  created_at timestamptz not null default now()
);

create table public.sketch_missions (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  key text not null,
  week integer not null,
  data jsonb not null,
  done boolean not null default false,
  done_at timestamptz,
  primary key (organization_id, key)
);

create table public.sketch_checkins (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  week date not null,
  answers jsonb not null,
  created_at timestamptz not null default now(),
  primary key (organization_id, week)
);

create table public.origin_codes (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  channel_key text not null,
  mission_key text,
  utm_url text not null,
  created_at timestamptz not null default now(),
  primary key (organization_id, code)
);

-- ---------- Cobrança (provedor "manual" primeiro) ----------
create table public.pricing_rules (
  version integer primary key,
  effective_from date not null,
  rules jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table public.billing_subscriptions (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  provider text not null default 'manual',
  status text not null default 'ativa' check (status in ('ativa', 'cancelada', 'pendente')),
  quote jsonb not null default '{}'::jsonb,
  billing_day smallint,
  external_ref text,
  updated_at timestamptz not null default now()
);

create table public.billing_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null,
  detail jsonb not null default '{}'::jsonb,
  actor uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- ---------- RLS ----------
do $$
declare t text;
begin
  foreach t in array array['mz_settings','mz_missions','mz_checkins','mz_results','weekly_signals','checkin_uploads'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_member(organization_id) and public.has_module(organization_id, ''marco_zero'')) with check (public.is_member(organization_id) and public.has_module(organization_id, ''marco_zero''))', t || '_mz', t);
  end loop;
  foreach t in array array['sketch_profiles','sketch_sources','sketch_messages','sketch_missions','sketch_checkins'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_member(organization_id) and public.has_module(organization_id, ''sketch'')) with check (public.is_member(organization_id) and public.has_module(organization_id, ''sketch''))', t || '_sk', t);
  end loop;
end $$;

-- aprendizados: cada módulo vê os seus
alter table public.learnings enable row level security;
create policy learnings_member on public.learnings for all to authenticated
  using (public.is_member(organization_id) and public.has_module(organization_id, module))
  with check (public.is_member(organization_id) and public.has_module(organization_id, module));

-- códigos de origem: o Sketch cria; o Marco Zero lê só com a integração ligada
alter table public.origin_codes enable row level security;
create policy oc_sketch on public.origin_codes for all to authenticated
  using (public.is_member(organization_id) and public.has_module(organization_id, 'sketch'))
  with check (public.is_member(organization_id) and public.has_module(organization_id, 'sketch'));

alter table public.job_runs enable row level security;
create policy jr_admin on public.job_runs for select to authenticated using (public.is_platform_admin());
alter table public.email_outbox enable row level security;
create policy eo_self on public.email_outbox for select to authenticated using (to_user = auth.uid() or public.is_platform_admin());

alter table public.pricing_rules enable row level security;
create policy pr_read on public.pricing_rules for select to authenticated using (true);
create policy pr_admin on public.pricing_rules for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

alter table public.billing_subscriptions enable row level security;
create policy bs_read on public.billing_subscriptions for select to authenticated using (public.is_member(organization_id) or public.is_platform_admin());
create policy bs_admin on public.billing_subscriptions for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
alter table public.billing_events enable row level security;
create policy be_read on public.billing_events for select to authenticated using (public.is_member(organization_id) or public.is_platform_admin());

grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant execute on all functions in schema public to authenticated, service_role;
