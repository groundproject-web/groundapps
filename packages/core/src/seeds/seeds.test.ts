import { describe, expect, it } from "vitest";
import { generateCarlaSeed } from "./carla";
import { importSpreadsheet } from "../pipeline";
import { computeBaseline } from "../metrics/baseline";
import { computeSegments } from "../metrics/segments";
import { computeIdleMoney } from "../metrics/idleMoney";
import { computeProductCycles, customersDueForProduct } from "../metrics/productCycle";
import { planFirstMission, planNextMission } from "../missions/planner";
import { computeMissionResult } from "../missions/attribution";
import { simulateWeekOrders } from "../pipeline";
import { addDays } from "../util";
import type { SendStatus } from "../missions/attribution";
import type { Blocker } from "../missions/checkin";

const seed = generateCarlaSeed();

describe("seed da Carla: planilha bagunçada", () => {
  const first = importSpreadsheet(seed.csv);
  it("descarta CPF e endereço", () => {
    expect(first.mapping.find((m) => m.header === "CPF")!.target).toBe("sensivel");
    expect(first.mapping.find((m) => m.header === "Endereço de entrega")!.target).toBe("sensivel");
    expect(first.mapping.find((m) => m.header === "Status do frete")!.target).toBe("ignorado");
  });
  it("3.412 pedidos, 37 junções automáticas e 1 par em dúvida", () => {
    expect(first.stats.ordersRead).toBe(3412);
    expect(first.problems).toEqual([]);
    expect(first.stats.autoMerged).toBe(37);
    expect(first.doubts).toHaveLength(1);
    expect(first.doubts[0].reason).toBe("mesmo_telefone");
    expect(first.stats.uniqueCustomers).toBe(2001);
  });

  const r = importSpreadsheet(seed.csv, { decisions: { [first.doubts[0].id]: "juntar" } });
  it("depois de confirmar o par: 2.000 clientes", () => {
    expect(r.stats.uniqueCustomers).toBe(2000);
  });
  it("números do protótipo", () => {
    const b = computeBaseline(r.customers, r.orders, seed.asOf);
    expect(b.customers).toBe(2000);
    expect(b.repeatCustomers).toBe(360);
    expect(Math.round(b.repurchaseRate * 100)).toBe(18);
    expect(b.ltvCents).toBe(20_900);
    expect(Math.round(b.daysToSecondMean!)).toBeGreaterThanOrEqual(48);
    expect(Math.round(b.daysToSecondMean!)).toBeLessThanOrEqual(56);
    expect(Math.round((1 - b.builtShare) * 100)).toBeGreaterThanOrEqual(65);
  });
  it("grupos com contagem e valor do protótipo", () => {
    const { segments } = computeSegments(r.customers, r.orders, seed.asOf);
    for (const [k, v] of Object.entries(seed.expected.groups)) {
      const s = segments.find((x) => x.key === k)!;
      expect([k, s.count, s.totalCents]).toEqual([k, v.count, v.totalCents]);
    }
    expect(segments.find((x) => x.key === "voltaram_ha_pouco")!.count).toBe(0);
  });
  it("dinheiro parado: 1.400 sumidas, ticket da 1ª compra R$ 150", () => {
    const idle = computeIdleMoney(r.customers, r.orders, seed.asOf);
    expect(idle.goneCount).toBe(1400);
    expect(idle.avgFirstTicketCents).toBe(15_000);
  });
  it("whey: ciclo de ~40 a 50 dias e 180 clientes no ponto", () => {
    const whey = computeProductCycles(r.customers, r.orders, seed.asOf)[0];
    expect(whey.product).toBe("Whey Fôlego 900g");
    expect(whey.p25Days).toBeGreaterThanOrEqual(40);
    expect(whey.p75Days).toBeLessThanOrEqual(52);
    expect(customersDueForProduct(r.customers, r.orders, seed.asOf, whey)).toHaveLength(180);
  });

  describe("ciclo completo: missão → check-in → resultado → ajuste, nos três caminhos", () => {
    const ctx = { storeOwner: "Carla", storeName: "Fôlego", customers: r.customers, orders: r.orders, asOf: seed.asOf, controlPct: 15 };
    const m1 = planFirstMission(ctx);
    it("a 1ª missão é a do whey, com 180 clientes e grupo de comparação", () => {
      const p = m1.parts[0];
      expect(p.targetIds.length + p.control.length).toBe(180);
      expect(p.control).toHaveLength(27);
      expect(p.message).toContain("[nome]");
      expect(p.message.toLowerCase()).not.toMatch(/cupom|desconto|%/);
      expect(m1.estimate.status).toBe("hipotese");
      expect(m1.estimate.orders).toBe(27);
    });

    const run = (status: SendStatus, blocker?: Blocker) => {
      const p = m1.parts[0];
      const recipients = status === "todas" ? p.targetIds : status === "parte" ? p.targetIds.slice(0, 120) : [];
      const others = r.customers.map((c) => c.id).filter((id) => !recipients.includes(id));
      const sim = simulateWeekOrders({ seed: `w1:${status}`, from: m1.weekStart, days: 7, recipients, others: others.filter((id) => p.targetIds.includes(id) || p.control.includes(id)), recipientRate: 0.175, baseRate: 0.05, avgTicketCents: 15_000, product: "Whey Fôlego 900g" });
      const orders = [...r.orders, ...sim];
      const { bySegment } = computeSegments(r.customers, r.orders, seed.asOf);
      const result = computeMissionResult({ sentAt: m1.weekStart, windowDays: 7, sendStatus: status, sentCount: recipients.length, targets: p.targetIds, control: p.control, orders, fallbackBaselineRate: 0.05, segmentOf: (id) => bySegment.get(id) ?? null });
      const next = planNextMission({ ...ctx, orders, asOf: addDays(seed.asOf, 7) }, m1, { sendStatus: status, blocker }, result);
      return { result, next };
    };

    it("mandei para todas: continua num grupo novo e conserta o grupo que travou", () => {
      const { result, next } = run("todas");
      expect(result.sent).toBe(153);
      expect(result.rate).toBeGreaterThan(result.comparison.rate);
      expect(next.smaller).toBe(false);
      expect(next.parts[0].role).toBe("continua");
      const previous = new Set([...m1.parts[0].targetIds, ...m1.parts[0].control]);
      expect(next.parts[0].targetIds.some((id) => previous.has(id))).toBe(false);
    });
    it("mandei para uma parte (faltou tempo): comparação inclui as não enviadas, e a missão vem em lotes", () => {
      const { result, next } = run("parte", "tempo");
      expect(result.sent).toBe(120);
      expect(result.comparison.kind).toBe("controle_e_nao_enviadas");
      expect(next.notes[0]).toContain("lotes de 50");
      expect(next.parts[0].batches).toBeGreaterThanOrEqual(1);
    });
    it("não consegui (receio): resultado sem informação e missão menor, mais curta", () => {
      const { result, next } = run("nenhuma", "receio");
      expect(result.effectStatus).toBe("sem_info");
      expect(result.cameBackAlone!.of).toBe(180);
      expect(next.smaller).toBe(true);
      expect(next.parts[0].targetIds.length).toBeLessThan(m1.parts[0].targetIds.length);
      expect(next.parts[0].message.length).toBeLessThan(m1.parts[0].message.length);
    });
    it("não consegui (sem contato): cria a missão extra do WhatsApp no checkout", () => {
      const { next } = run("nenhuma", "contato");
      expect(next.parts.some((p) => p.role === "extra")).toBe(true);
    });
  });
});
