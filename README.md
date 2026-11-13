# Ground Apps — Marco Zero + Sketch

Plataforma da Ground Project com dois módulos na mesma conta: **Ground Marco Zero** (recompra) e **Ground Sketch** (aquisição construída). *Paid attention → owned ground.*

## Rodar local (modo demo, sem nenhuma conta externa)

Pré-requisito: Node 20+.

```bash
npm install
```

```bash
npm run dev
```

Abra http://localhost:3000/entrar e entre como **Carla** (Marco Zero + Sketch), **João** (Sketch sozinho) ou **Sócio** (painel interno). No primeiro boot o app cria um Postgres local (PGlite) em `.data/`, aplica as migrations e a seed. Para recomeçar do zero, pare o servidor e apague `.data/`.

Senha das contas de demo: `DEMO_PASSWORD` (padrão em `.env.example`).

## Estrutura

```
apps/web          Next.js (App Router): telas, ações, rotas, cron
packages/core     domínio e cálculos puros (métricas, grupos, missões, atribuição, preço, Sketch, eventos) + seeds
packages/ui       design system Terra Neutra (tokens + componentes)
packages/ai       cliente da API da Anthropic, prompts versionados, schemas Zod, custo
supabase/         migrations SQL com RLS + testes de RLS
e2e/              testes de ponta a ponta (Playwright)
docs/             PRDs, fases, decisões, relatórios
```

## Qualidade

```bash
npm test
```

```bash
npm run typecheck
```

```bash
npm run lint
```

```bash
npm run test:e2e
```

CI no GitHub Actions: `.github/workflows/ci.yml`.

## Staging (Vercel + Supabase São Paulo)

1. Supabase: crie o projeto de staging na região São Paulo e aplique `supabase/migrations/` (CLI do Supabase: `supabase db push`).
2. Vercel: importe o repositório com raiz `apps/web` e preencha as variáveis de `.env.example` (`APP_ENV=staging`).
3. O cron semanal está em `apps/web/vercel.json`.

Detalhes e pendências: `docs/RELATORIO_ENTREGA.md`.
