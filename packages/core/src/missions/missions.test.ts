import { describe, expect, it } from "vitest";
import type { Order } from "../types";
import { splitControlGroup, controlSentence } from "./control";
import { computeMissionResult, estimateMission, MIN_VALID_CONTROL } from "./attribution";
import { classifyRepliesOffline, scrubExcerpt, signalsFromReplies } from "./checkin";
import { markAdjusted, newLearning, recordOutcome, learningBadge } from "../learnings/evolve";
import { detectStructural, weekStart } from "../signals/structural";

const ids = (p: string, n: number) => Array.from({ length: n }, (_, i) => `${p}${String(i).padStart(3, "0")}`);
const order = (customerId: string, date: string, cents = 15_000): Order => ({ id: `o_${customerId}_${date}`, customerId, date, totalCents: cents });

describe("grupo de comparação", () => {
  it("sorteia ~15% e é determinístico pela semente", () => {
    const list = ids("c", 180);
    const a = splitControlGroup(list, "missao-1", 15);
    const b = splitControlGroup([...list].reverse(), "missao-1", 15);
    expect(a.control).toHaveLength(27);
    expect(a.recipients).toHaveLength(153);
    expect(a).toEqual(b);
    expect(new Set([...a.control, ...a.recipients]).size).toBe(180);
    expect(splitControlGroup(list, "missao-2", 15).control).not.toEqual(a.control);
  });
  it("explica em uma frase", () => {
    expect(controlSentence(27)).toBe("Separamos 27 clientes para comparar. Não mande para elas.");
  });
});

describe("atribuição com grupo de comparação", () => {
  const targets = ids("t", 100);
  const control = ids("k", 25);
  const sentAt = "2026-11-18";
  // 20 das que receberam voltam dentro da janela; 2 voltam fora; 2 do controle voltam
  const orders: Order[] = [
    ...targets.slice(0, 20).map((c) => order(c, "2026-11-22")),
    order(targets[50], "2026-11-26"), // dia 8: fora da janela de 7 dias
    order(targets[51], "2026-11-18"), // no dia do envio: não conta
    order(control[0], "2026-11-20"),
    order(control[1], "2026-11-21"),
  ];
  it("conta só pedidos de quem recebeu, dentro da janela", () => {
    const r = computeMissionResult({ sentAt, windowDays: 7, sendStatus: "todas", targets, control, orders, fallbackBaselineRate: 0.05 });
    expect(r.sent).toBe(100);
    expect(r.returned).toBe(20);
    expect(r.rate).toBeCloseTo(0.2);
    expect(r.revenueCents).toBe(20 * 15_000);
    expect(r.comparison.kind).toBe("grupo_de_comparacao");
    expect(r.comparison.rate).toBeCloseTo(2 / 25);
    expect(r.comparison.weak).toBe(false);
    expect(r.extraOrders).toBe(12); // 100 × (20% − 8%)
    expect(r.effectStatus).toBe("fato");
  });
  it("comparação fraca quando o controle tem menos de 20 clientes", () => {
    const r = computeMissionResult({ sentAt, windowDays: 7, sendStatus: "todas", targets, control: control.slice(0, MIN_VALID_CONTROL - 1), orders, fallbackBaselineRate: 0.05 });
    expect(r.comparison.kind).toBe("clientes_parecidas");
    expect(r.comparison.weak).toBe(true);
    expect(r.comparison.rate).toBe(0.05);
    expect(r.effectStatus).toBe("hipotese");
    expect(r.extraOrders).toBe(15);
  });
  it("mandei para uma parte: as não enviadas entram na comparação", () => {
    const r = computeMissionResult({ sentAt, windowDays: 7, sendStatus: "parte", sentCount: 60, targets, control, orders, fallbackBaselineRate: 0.05 });
    expect(r.sent).toBe(60);
    expect(r.returned).toBe(20);
    expect(r.comparison.kind).toBe("controle_e_nao_enviadas");
    expect(r.comparison.size).toBe(25 + 40);
  });
  it("não consegui: mostra quem voltou sozinha e o efeito fica sem informação", () => {
    const r = computeMissionResult({ sentAt, windowDays: 7, sendStatus: "nenhuma", targets, control, orders, fallbackBaselineRate: 0.05 });
    expect(r.sent).toBe(0);
    expect(r.cameBackAlone).toEqual({ count: 22, of: 125, rate: 22 / 125 });
    expect(r.effectStatus).toBe("sem_info");
  });
  it("quebra por grupo", () => {
    const r = computeMissionResult({ sentAt, windowDays: 7, sendStatus: "todas", targets, control, orders, fallbackBaselineRate: 0.05, segmentOf: (id) => (Number(id.slice(1)) < 50 ? "em_risco" : "compra_unica_recente") });
    expect(r.byGroup).toEqual([
      { segment: "em_risco", sent: 50, returned: 20, rate: 0.4 },
      { segment: "compra_unica_recente", sent: 50, returned: 0, rate: 0 },
    ]);
  });
  it("estimativa é sempre hipótese", () => {
    expect(estimateMission(180, 0.15, 15_000)).toEqual({ orders: 27, revenueCents: 405_000, status: "hipotese", responseRate: 0.15 });
  });
});

describe("check-in: classificação das respostas", () => {
  const replies = ["Pode mandar o link!", "O frete tá caro demais", "Frete de novo?", "entrega demorou e o frete...", "Tem sabor chocolate amargo?", "Comprei na loja física da academia", "Ana: quero sim, manda"];
  const c = classifyRepliesOffline(replies);
  it("conta por categoria e guarda como hipótese", () => {
    const by = Object.fromEntries(c.map((x) => [x.category, x.count]));
    expect(by).toMatchObject({ pediu_link: 2, frete: 3, sabor_novo: 1, comprou_fora: 1 });
    expect(c.every((x) => x.status === "hipotese")).toBe(true);
  });
  it("sinal estrutural a partir de 3 queixas", () => {
    expect(signalsFromReplies(c)).toEqual(["frete"]);
  });
  it("trecho sem nome nem telefone", () => {
    expect(scrubExcerpt("Ana: me liga no (21) 99999-0001")).toBe("[cliente]: me liga no [telefone]");
  });
});

describe("evolução dos aprendizados", () => {
  const base = newLearning("cuidado_sem_cupom", "Mensagem de cuidado, sem cupom, traz cliente de volta.", "mensagem", "2026-11-18");
  it("funcionou 1× com comparação válida → fato · testado 1×", () => {
    const l = recordOutcome(base, "sucesso", { validComparison: true, missionId: "m1", at: "2026-11-25" });
    expect(l.state).toBe("fato");
    expect(learningBadge(l)).toBe("Fato · testado 1×");
    const l2 = recordOutcome(l, "sucesso", { validComparison: true, missionId: "m2", at: "2026-12-02" });
    expect(learningBadge(l2)).toBe("Fato · testado 2×");
    expect(l2.evidenceMissionIds).toEqual(["m1", "m2"]);
  });
  it("a mesma missão não conta duas vezes (idempotente)", () => {
    const l = recordOutcome(base, "sucesso", { validComparison: true, missionId: "m1", at: "2026-11-25" });
    expect(recordOutcome(l, "sucesso", { validComparison: true, missionId: "m1", at: "2026-11-25" })).toBe(l);
  });
  it("sem comparação válida continua hipótese", () => {
    expect(recordOutcome(base, "sucesso", { validComparison: false, missionId: "m1", at: "x" }).state).toBe("hipotese");
  });
  it("falhou em 2 testes → descartado", () => {
    let l = recordOutcome(base, "falha", { validComparison: true, missionId: "m1", at: "a" });
    expect(l.state).toBe("hipotese");
    l = recordOutcome(l, "falha", { validComparison: true, missionId: "m2", at: "b" });
    expect(l.state).toBe("descartado");
    expect(recordOutcome(l, "sucesso", { validComparison: true, missionId: "m3", at: "c" }).state).toBe("descartado");
  });
  it("ajustado depois de travar → ajustado", () => {
    const l = recordOutcome(base, "falha", { validComparison: true, missionId: "m1", at: "a" });
    expect(markAdjusted(l, { at: "b", missionId: "m2" }).state).toBe("ajustado");
    expect(markAdjusted(l, { at: "b" }).history.map((h) => h.kind)).toEqual(["criado", "falha", "ajustado"]);
  });
});

describe("gargalo estrutural", () => {
  it("3 semanas seguidas viram assunto de estrutura", () => {
    const s = [
      { week: "2026-11-02", type: "frete" },
      { week: "2026-11-09", type: "frete" },
      { week: "2026-11-16", type: "frete" },
      { week: "2026-11-09", type: "preco" },
      { week: "2026-11-16", type: "preco" },
      { week: "2026-11-16", type: "sabor" },
    ];
    expect(detectStructural(s, "2026-11-16")).toEqual([{ type: "frete", weeks: ["2026-11-02", "2026-11-09", "2026-11-16"] }]);
  });
  it("buraco na sequência zera", () => {
    const s = ["2026-10-26", "2026-11-09", "2026-11-16"].map((week) => ({ week, type: "frete" }));
    expect(detectStructural(s, "2026-11-16")).toEqual([]);
  });
  it("segunda-feira da semana", () => {
    expect(weekStart("2026-11-19")).toBe("2026-11-16");
    expect(weekStart("2026-11-16")).toBe("2026-11-16");
    expect(weekStart("2026-11-22")).toBe("2026-11-16");
  });
});
