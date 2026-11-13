import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { importSpreadsheet } from "../pipeline";
import { computeBaseline } from "./baseline";
import { computeSegments } from "./segments";
import { computeIdleMoney, simulateReturn } from "./idleMoney";
import { computeProductCycles } from "./productCycle";

const csv = readFileSync(join(__dirname, "../../fixtures/loja-pequena.csv"), "utf8");
const AS_OF = "2026-06-30";

describe("importação da fixture", () => {
  const r = importSpreadsheet(csv);
  it("descarta CPF (dado sensível) e status do frete", () => {
    expect(r.mapping.find((m) => m.header === "CPF")?.target).toBe("sensivel");
    expect(r.mapping.find((m) => m.header === "Status do frete")?.target).toBe("ignorado");
    expect(r.discarded).toEqual(expect.arrayContaining(["CPF", "Status do frete"]));
  });
  it("lê pedidos, aponta a linha inválida e junta cadastro repetido", () => {
    expect(r.stats.ordersRead).toBe(13);
    expect(r.problems).toHaveLength(1);
    expect(r.stats.autoMerged).toBe(1); // "Edu L." = "Edu Lima" (mesmo e-mail e telefone)
    expect(r.doubts).toHaveLength(1); // Gabi Rocha × Gabriela R. (mesmo telefone)
    expect(r.doubts[0].reason).toBe("mesmo_telefone");
    expect(r.stats.uniqueCustomers).toBe(8);
  });
  it("nenhum CPF chega aos dados importados", () => {
    expect(JSON.stringify([r.customers, r.orders])).not.toMatch(/\d{3}\.\d{3}\.\d{3}-\d{2}/);
  });
  it("confirmar o par em dúvida junta as clientes", () => {
    const merged = importSpreadsheet(csv, { decisions: { [r.doubts[0].id]: "juntar" } });
    expect(merged.stats.uniqueCustomers).toBe(7);
    const separate = importSpreadsheet(csv, { decisions: { [r.doubts[0].id]: "separar" } });
    expect(separate.stats.uniqueCustomers).toBe(8);
    expect(separate.stats.pendingDoubts).toBe(0);
  });
});

describe("seu marco zero", () => {
  const { customers, orders } = importSpreadsheet(csv);
  const b = computeBaseline(customers, orders, AS_OF);
  it("clientes, recompra, tempo até a 2ª compra e LTV", () => {
    expect(b.customers).toBe(8);
    expect(b.orders).toBe(13);
    expect(b.repeatCustomers).toBe(3);
    expect(b.repurchaseRate).toBeCloseTo(3 / 8);
    expect(b.daysToSecondMedian).toBe(31);
    expect(b.daysToSecondMean).toBeCloseTo(34);
    expect(b.totalRevenueCents).toBe(128_000);
    expect(b.ltvCents).toBe(16_000);
  });
  it("receita alugada × construída", () => {
    expect(b.rentedCents).toBe(76_000);
    expect(b.builtCents).toBe(52_000);
    expect(b.builtShare).toBeCloseTo(0.40625);
    expect(b.monthly.map((m) => m.month)).toEqual(["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"]);
    expect(b.monthly.map((m) => [m.rentedCents / 100, m.builtCents / 100])).toEqual([
      [160, 0],
      [60, 100],
      [200, 100],
      [0, 100],
      [120, 0],
      [80, 220],
    ]);
  });
});

describe("grupos", () => {
  const { customers, orders, doubts } = importSpreadsheet(csv);
  it("aplica as regras padrão", () => {
    const { segments } = computeSegments(customers, orders, AS_OF);
    const by = Object.fromEntries(segments.map((s) => [s.key, [s.count, s.totalCents / 100]]));
    expect(by).toEqual({ fieis: [1, 400], em_risco: [1, 300], sumidos: [4, 260], compra_unica_recente: [1, 80], voltaram_ha_pouco: [1, 240] });
  });
  it("juntar o par em dúvida move a cliente para Em risco", () => {
    const m = importSpreadsheet(csv, { decisions: { [doubts[0].id]: "juntar" } });
    const { segments } = computeSegments(m.customers, m.orders, AS_OF);
    expect(segments.find((s) => s.key === "em_risco")!.count).toBe(2);
    expect(segments.find((s) => s.key === "sumidos")!.count).toBe(2);
  });
  it("bordas: 60 dias ainda é fiel; 61 já é em risco; 90 é recente; 91 é sumido", () => {
    const c = [{ id: "x", name: "X" }];
    const o = (dates: string[]) => dates.map((d, i) => ({ id: `o${i}`, customerId: "x", date: d, totalCents: 100 }));
    const seg = (dates: string[], asOf: string) => computeSegments(c, o(dates), asOf).segments.find((s) => s.count === 1)!.key;
    expect(seg(["2026-01-01", "2026-02-01", "2026-03-01"], "2026-04-30")).toBe("fieis"); // 60 dias
    expect(seg(["2026-01-01", "2026-02-01", "2026-03-01"], "2026-05-01")).toBe("em_risco"); // 61
    expect(seg(["2026-01-01"], "2026-04-01")).toBe("compra_unica_recente"); // 90
    expect(seg(["2026-01-01"], "2026-04-02")).toBe("sumidos"); // 91
  });
});

describe("dinheiro parado", () => {
  const { customers, orders } = importSpreadsheet(csv);
  const idle = computeIdleMoney(customers, orders, AS_OF);
  it("sumidas e ticket médio da 1ª compra", () => {
    expect(idle.goneCount).toBe(4);
    expect(idle.avgFirstTicketCents).toBe(6_500);
  });
  it("simulador: sumidas × % × ticket, e por mês em 6 meses", () => {
    const s = simulateReturn(idle, 25);
    expect(s.customersBack).toBe(1);
    expect(s.revenueCents).toBe(6_500);
    expect(s.perMonthCents).toBe(1_083);
  });
  it("o controle fica entre 1% e 40%", () => {
    expect(simulateReturn(idle, 0).percent).toBe(1);
    expect(simulateReturn(idle, 90).percent).toBe(40);
  });
  it("caso do protótipo: 1.400 sumidas × 10% × R$ 150 = R$ 21.000", () => {
    const s = simulateReturn({ goneCount: 1400, avgFirstTicketCents: 15_000 }, 10);
    expect(s.customersBack).toBe(140);
    expect(s.revenueCents).toBe(2_100_000);
    expect(s.perMonthCents).toBe(350_000);
  });
});

describe("ciclo de recompra por produto", () => {
  const { customers, orders } = importSpreadsheet(csv);
  it("mediana do intervalo entre compras do mesmo produto", () => {
    const cycles = computeProductCycles(customers, orders, AS_OF, 1);
    const whey = cycles.find((c) => c.product === "Whey 900g")!;
    expect(whey.intervals).toBe(4); // 41, 40, 61, 31
    expect(whey.medianDays).toBe(41); // 40,5 arredondado
  });
});
