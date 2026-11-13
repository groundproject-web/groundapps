import { describe, expect, it } from "vitest";
import { acceptUpgrade, DEFAULT_PRICING_RULES as R, evaluateTier, quote, rulesAt, tierForBase, type PricingRules, type SketchPlan } from "./engine";
import { checkinStreak, terrainLevel } from "./gamification";

const G: PricingRules = { ...R, gamificationEnabled: true };

describe("faixa do Marco Zero pelo tamanho da base", () => {
  it.each([
    [0, "MZ1"],
    [500, "MZ1"],
    [501, "MZ2"],
    [5000, "MZ2"],
    [5001, "MZ3"],
    [20000, "MZ3"],
    [20001, "MZ4"],
  ])("%i clientes → %s", (n, t) => expect(tierForBase(n, R).id).toBe(t));
});

describe("preço para todas as combinações", () => {
  const tiers = R.mzTiers.map((t) => t.id);
  const plans: (SketchPlan | null)[] = [null, "inicio", "completo"];
  for (const tier of [null, ...tiers]) {
    for (const plan of plans) {
      if (!tier && !plan) continue;
      for (const streak of [0, 3, 4, 8, 12, 40]) {
        it(`${tier ?? "—"} + ${plan ?? "—"} · sequência ${streak}`, () => {
          const q = quote({ mzTierId: tier, sketchPlan: plan, checkinStreak: streak }, G);
          const full = (tier ? R.mzTiers.find((t) => t.id === tier)!.priceCents : 0) + (plan ? R.sketchPlans[plan] : 0);
          expect(q.fullCents).toBe(full);
          const combo = !!tier && !!plan;
          const expectedPct = combo ? Math.min(30, 20 + Math.floor(streak / 4) * 5) : 0;
          expect(q.totalDiscountPct).toBe(expectedPct);
          expect(q.totalDiscountPct).toBeLessThanOrEqual(G.streak.maxTotalDiscountPct);
          expect(q.totalCents).toBe(Math.round((full * (100 - expectedPct)) / 100));
          expect(q.savingsCents).toBe(full - q.totalCents);
        });
      }
    }
  }
  it("protótipo: Completo + MZ2 = R$ 394 → R$ 315,20", () => {
    const q = quote({ mzTierId: "MZ2", sketchPlan: "completo" }, R);
    expect(q.fullCents).toBe(39_400);
    expect(q.totalCents).toBe(31_520);
  });
  it("sem a gamificação aprovada, a sequência não dá bônus", () => {
    expect(quote({ mzTierId: "MZ2", sketchPlan: "inicio", checkinStreak: 12 }, R).totalDiscountPct).toBe(20);
  });
  it("bônus de constância só vale para o combo", () => {
    expect(quote({ mzTierId: "MZ2", checkinStreak: 12 }, G).totalDiscountPct).toBe(0);
  });
});

describe("versão da regra de preço", () => {
  const v2: PricingRules = { ...R, version: 2, effectiveFrom: "2027-01-01", sketchPlans: { inicio: 7700, completo: 15700 } };
  it("uma regra nova só vale a partir da data de início", () => {
    expect(rulesAt([R, v2], "2026-12-31").version).toBe(1);
    expect(rulesAt([R, v2], "2027-01-01").version).toBe(2);
    expect(quote({ sketchPlan: "inicio" }, rulesAt([R, v2], "2026-12-31")).totalCents).toBe(6700);
  });
  it("sem regra vigente, erro explícito", () => {
    expect(() => rulesAt([v2], "2026-06-01")).toThrow();
  });
});

describe("upgrade de faixa: aviso → carência → aceite", () => {
  it("a base passa de 5.000: aviso com 30 dias de carência, preço não muda", () => {
    const n = evaluateTier({ billedTier: "MZ2", customers: 5200, today: "2026-11-16", current: { kind: "ok" }, rules: R });
    expect(n.state).toEqual({ kind: "aviso", fromTier: "MZ2", toTier: "MZ3", noticedAt: "2026-11-16", graceEndsAt: "2026-12-16" });
    expect(n.billedTier).toBe("MZ2");
  });
  it("durante a carência, nada muda", () => {
    const first = evaluateTier({ billedTier: "MZ2", customers: 5200, today: "2026-11-16", current: { kind: "ok" }, rules: R });
    const again = evaluateTier({ billedTier: "MZ2", customers: 5300, today: "2026-12-10", current: first.state, rules: R });
    expect(again.state).toEqual(first.state);
    expect(again.billedTier).toBe("MZ2");
  });
  it("sem aceite ao fim da carência: preço não muda, missões limitadas ao teto", () => {
    const first = evaluateTier({ billedTier: "MZ2", customers: 5200, today: "2026-11-16", current: { kind: "ok" }, rules: R });
    const late = evaluateTier({ billedTier: "MZ2", customers: 5200, today: "2026-12-17", current: first.state, rules: R });
    expect(late.billedTier).toBe("MZ2");
    expect(late.state).toEqual({ kind: "carencia_vencida", fromTier: "MZ2", toTier: "MZ3", capCustomers: 5000 });
  });
  it("só com o aceite a faixa muda", () => {
    const first = evaluateTier({ billedTier: "MZ2", customers: 5200, today: "2026-11-16", current: { kind: "ok" }, rules: R });
    expect(acceptUpgrade(first).billedTier).toBe("MZ3");
  });
  it("base que encolhe sugere downgrade", () => {
    expect(evaluateTier({ billedTier: "MZ3", customers: 4000, today: "2026-11-16", current: { kind: "ok" }, rules: R }).state.kind).toBe("sugerir_downgrade");
  });
});

describe("gamificação (proposta)", () => {
  it.each([
    [0.1, "Terreno alugado"],
    [0.2, "Terreno marcado"],
    [0.34, "Terreno marcado"],
    [0.35, "Fundação"],
    [0.5, "Fundação"],
    [0.51, "Terreno construído"],
  ])("receita construída %f → %s", (s, name) => expect(terrainLevel(s).name).toBe(name));
  it("sequência de check-ins quebra no primeiro não respondido", () => {
    expect(
      checkinStreak([
        { week: "2026-11-16", answered: true },
        { week: "2026-11-09", answered: true },
        { week: "2026-11-02", answered: false },
        { week: "2026-10-26", answered: true },
      ]),
    ).toBe(2);
  });
});
