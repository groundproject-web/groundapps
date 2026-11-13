import { z } from "zod";
import { addDays } from "../util";

/**
 * Motor de preço. Todo valor vem de `pricing_rules` (versionada, com data de início).
 * Nada fica fixo no código: DEFAULT_PRICING_RULES é só a semente (HIPÓTESE).
 */
export const MzTierSchema = z.object({
  id: z.string(),
  label: z.string(),
  maxCustomers: z.number().int().nullable(), // null = sem teto
  priceCents: z.number().int().nonnegative(),
  ecomBridge: z.boolean().default(false),
});

export const PricingRulesSchema = z.object({
  version: z.number().int().positive(),
  effectiveFrom: z.string(), // yyyy-mm-dd
  mzTiers: z.array(MzTierSchema).min(1),
  sketchPlans: z.object({ inicio: z.number().int(), completo: z.number().int() }),
  comboDiscountPct: z.number().min(0).max(100),
  streak: z.object({ every: z.number().int().positive(), bonusPct: z.number().min(0), maxTotalDiscountPct: z.number().min(0).max(100) }),
  upgradeGraceDays: z.number().int().nonnegative(),
  /** Mecânicas de gamificação: PROPOSTA, desligadas até o aval dos sócios. */
  gamificationEnabled: z.boolean(),
  freemiumFirstReading: z.boolean(),
  attributionWindowDays: z.number().int().positive(),
  controlGroupPct: z.number().min(0).max(50),
});

export type PricingRules = z.infer<typeof PricingRulesSchema>;
export type MzTier = z.infer<typeof MzTierSchema>;
export type SketchPlan = "inicio" | "completo";

export const DEFAULT_PRICING_RULES: PricingRules = {
  version: 1,
  effectiveFrom: "2026-01-01",
  mzTiers: [
    { id: "MZ1", label: "Até 500", maxCustomers: 500, priceCents: 9700, ecomBridge: false },
    { id: "MZ2", label: "500 a 5 mil", maxCustomers: 5000, priceCents: 24700, ecomBridge: false },
    { id: "MZ3", label: "5 a 20 mil", maxCustomers: 20000, priceCents: 49700, ecomBridge: false },
    { id: "MZ4", label: "20 mil+", maxCustomers: null, priceCents: 89700, ecomBridge: true },
  ],
  sketchPlans: { inicio: 6700, completo: 14700 },
  comboDiscountPct: 20,
  streak: { every: 4, bonusPct: 5, maxTotalDiscountPct: 30 },
  upgradeGraceDays: 30,
  gamificationEnabled: false,
  freemiumFirstReading: false,
  attributionWindowDays: 7,
  controlGroupPct: 15,
};

/** A regra vigente numa data: a de maior versão com effectiveFrom ≤ data. */
export function rulesAt(all: PricingRules[], date: string): PricingRules {
  const valid = all.filter((r) => r.effectiveFrom <= date).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom) || b.version - a.version);
  if (!valid.length) throw new Error(`Nenhuma regra de preço vigente em ${date}`);
  return valid[0];
}

export function tierForBase(customers: number, rules: PricingRules): MzTier {
  const tiers = [...rules.mzTiers].sort((a, b) => (a.maxCustomers ?? Infinity) - (b.maxCustomers ?? Infinity));
  return tiers.find((t) => t.maxCustomers === null || customers <= t.maxCustomers) ?? tiers[tiers.length - 1];
}

export function tierIndex(id: string, rules: PricingRules): number {
  return [...rules.mzTiers].sort((a, b) => (a.maxCustomers ?? Infinity) - (b.maxCustomers ?? Infinity)).findIndex((t) => t.id === id);
}

export interface PriceInput {
  mzTierId?: string | null;
  sketchPlan?: SketchPlan | null;
  /** check-ins respondidos em sequência (qualquer módulo) */
  checkinStreak?: number;
}

export interface PriceLine {
  label: string;
  cents: number;
}

export interface PriceQuote {
  lines: PriceLine[];
  fullCents: number;
  isCombo: boolean;
  baseDiscountPct: number;
  streakBonusPct: number;
  totalDiscountPct: number;
  totalCents: number;
  savingsCents: number;
  rulesVersion: number;
}

export function quote(input: PriceInput, rules: PricingRules): PriceQuote {
  const lines: PriceLine[] = [];
  if (input.mzTierId) {
    const t = rules.mzTiers.find((x) => x.id === input.mzTierId);
    if (!t) throw new Error(`Faixa desconhecida: ${input.mzTierId}`);
    lines.push({ label: `Marco Zero · ${t.label}`, cents: t.priceCents });
  }
  if (input.sketchPlan) lines.push({ label: `Sketch · ${input.sketchPlan === "inicio" ? "Início" : "Completo"}`, cents: rules.sketchPlans[input.sketchPlan] });
  const full = lines.reduce((s, l) => s + l.cents, 0);
  const isCombo = lines.length === 2;
  const base = isCombo ? rules.comboDiscountPct : 0;
  let bonus = 0;
  if (isCombo && rules.gamificationEnabled && input.checkinStreak) {
    bonus = Math.floor(input.checkinStreak / rules.streak.every) * rules.streak.bonusPct;
  }
  const total = Math.min(rules.streak.maxTotalDiscountPct, base + bonus);
  const effectiveBonus = Math.max(0, total - base);
  const totalCents = Math.round((full * (100 - total)) / 100);
  return {
    lines,
    fullCents: full,
    isCombo,
    baseDiscountPct: base,
    streakBonusPct: effectiveBonus,
    totalDiscountPct: total,
    totalCents,
    savingsCents: full - totalCents,
    rulesVersion: rules.version,
  };
}

/* ---------- Upgrade de faixa do Marco Zero ---------- */

export type UpgradeState =
  | { kind: "ok" }
  | { kind: "aviso"; fromTier: string; toTier: string; noticedAt: string; graceEndsAt: string }
  | { kind: "carencia_vencida"; fromTier: string; toTier: string; capCustomers: number }
  | { kind: "sugerir_downgrade"; fromTier: string; toTier: string };

export interface UpgradeNotice {
  state: UpgradeState;
  /** a faixa cobrada: só muda com o aceite do lojista */
  billedTier: string;
}

/**
 * Roda a cada sincronização ou planilha nova.
 * aviso → carência (30 dias, nada muda) → upgrade SÓ com aceite.
 * Sem aceite ao fim da carência: leitura continua, missões limitadas ao teto da faixa atual (proposta).
 */
export function evaluateTier(params: { billedTier: string; customers: number; today: string; current: UpgradeState; rules: PricingRules }): UpgradeNotice {
  const { billedTier, customers, today, current, rules } = params;
  const target = tierForBase(customers, rules);
  const bi = tierIndex(billedTier, rules);
  const ti = tierIndex(target.id, rules);
  if (ti > bi) {
    if (current.kind === "aviso" && current.toTier === target.id) {
      if (today > current.graceEndsAt) {
        const billed = rules.mzTiers.find((t) => t.id === billedTier)!;
        return { billedTier, state: { kind: "carencia_vencida", fromTier: billedTier, toTier: target.id, capCustomers: billed.maxCustomers ?? customers } };
      }
      return { billedTier, state: current };
    }
    if (current.kind === "carencia_vencida" && current.toTier === target.id) return { billedTier, state: current };
    return { billedTier, state: { kind: "aviso", fromTier: billedTier, toTier: target.id, noticedAt: today, graceEndsAt: addDays(today, rules.upgradeGraceDays) } };
  }
  if (ti < bi) return { billedTier, state: { kind: "sugerir_downgrade", fromTier: billedTier, toTier: target.id } };
  return { billedTier, state: { kind: "ok" } };
}

export function acceptUpgrade(notice: UpgradeNotice): UpgradeNotice {
  if (notice.state.kind === "aviso" || notice.state.kind === "carencia_vencida") return { billedTier: notice.state.toTier, state: { kind: "ok" } };
  if (notice.state.kind === "sugerir_downgrade") return { billedTier: notice.state.toTier, state: { kind: "ok" } };
  return notice;
}

export function upgradeHeadline(customers: number, rules: PricingRules, fromTier: string): string {
  const from = rules.mzTiers.find((t) => t.id === fromTier);
  const limit = from?.maxCustomers ?? customers;
  return `Sua base passou de ${limit.toLocaleString("pt-BR")} clientes. Isso é terreno construído.`;
}
