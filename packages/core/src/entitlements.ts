import type { ModuleKey } from "./types";

/**
 * Entitlements: quais módulos cada organização assinou.
 * A checagem de visibilidade cruzada fica SÓ aqui.
 */
export interface Entitlement {
  module: ModuleKey;
  plan: string; // MZ1..MZ4 | inicio | completo
  status: "ativo" | "carencia" | "cancelado";
  source: "manual" | "gateway";
}

export function activeModules(ents: Entitlement[]): Set<ModuleKey> {
  return new Set(ents.filter((e) => e.status === "ativo" || e.status === "carencia").map((e) => e.module));
}

export function hasModule(ents: Entitlement[], m: ModuleKey): boolean {
  return activeModules(ents).has(m);
}

/** Um módulo só enxerga dados do outro quando as DUAS assinaturas estão ativas. */
export function integrationEnabled(ents: Entitlement[]): boolean {
  const a = activeModules(ents);
  return a.has("marco_zero") && a.has("sketch");
}

export function sketchPlan(ents: Entitlement[]): "inicio" | "completo" | null {
  const e = ents.find((x) => x.module === "sketch" && x.status !== "cancelado");
  return e ? (e.plan === "completo" ? "completo" : "inicio") : null;
}
