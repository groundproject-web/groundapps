import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { integrationEnabled, type Entitlement, type ModuleKey } from "@ground/core";
import { getDb } from "./db";
import { getCurrentOrgId, requireSession, type Session } from "./auth";

export interface Org {
  id: string;
  name: string;
  slug: string;
  owner_display_name: string;
  segment: string;
  store_url: string | null;
  is_demo: boolean;
  clock_date: string | null;
}

export interface OrgContext {
  session: Session;
  org: Org;
  orgs: Org[];
  entitlements: Entitlement[];
  modules: Set<ModuleKey>;
  integrated: boolean;
  today: string;
}

function toIso(d: unknown): string | null {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

/** Contexto da loja atual, lido COMO O USUÁRIO (RLS ligada). */
export const getOrgContext = cache(async (): Promise<OrgContext> => {
  const session = await requireSession();
  const db = await getDb();
  const wanted = await getCurrentOrgId();
  return db.asUser(session.userId, async (t) => {
    const orgs = (await t.query<Org>("select o.* from organizations o join memberships m on m.organization_id = o.id and m.user_id = auth.uid() order by o.created_at")).map((o) => ({ ...o, clock_date: toIso(o.clock_date) }));
    if (!orgs.length) redirect("/sem-loja");
    const org = orgs.find((o) => o.id === wanted) ?? orgs[0];
    const ents = await t.query<{ module: ModuleKey; plan: string; status: Entitlement["status"]; source: Entitlement["source"] }>("select module, plan, status, source from entitlements where organization_id = $1", [org.id]);
    const entitlements: Entitlement[] = ents.map((e) => ({ module: e.module, plan: e.plan, status: e.status, source: e.source }));
    const modules = new Set(entitlements.filter((e) => e.status !== "cancelado").map((e) => e.module));
    return { session, org, orgs, entitlements, modules, integrated: integrationEnabled(entitlements), today: org.clock_date ?? new Date().toISOString().slice(0, 10) };
  });
});

export async function requireModule(m: ModuleKey): Promise<OrgContext> {
  const ctx = await getOrgContext();
  if (!ctx.modules.has(m)) redirect(`/app/plano?modulo=${m}`);
  return ctx;
}
