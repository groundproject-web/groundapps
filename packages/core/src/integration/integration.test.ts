import { describe, expect, it } from "vitest";
import { attributeOnce, consumeOnce, makeEvent } from "./events";
import { integrationEnabled, type Entitlement } from "../entitlements";
import { repurchaseBySource, reprioritizeChannels } from "../sketch/repurchaseBySource";
import { extractSourceCode, makeOriginCode } from "../sketch/origin";
import { assertNoPriceColumns, findEmptySpace, validateTrafficTest } from "../sketch/model";
import { verifyExpressions } from "../sketch/quotes";
import { carlaSketchSeed, joaoSeed } from "../seeds/sketch";
import type { Customer, Order } from "../types";
import { canShow, shouldSuggestMarcoZero, shouldSuggestSketch } from "../suggestions";

describe("entitlements", () => {
  const mz: Entitlement = { module: "marco_zero", plan: "MZ2", status: "ativo", source: "manual" };
  const sk: Entitlement = { module: "sketch", plan: "completo", status: "ativo", source: "manual" };
  it("a integração só liga com as duas assinaturas ativas", () => {
    expect(integrationEnabled([mz, sk])).toBe(true);
    expect(integrationEnabled([mz])).toBe(false);
    expect(integrationEnabled([mz, { ...sk, status: "cancelado" }])).toBe(false);
  });
});

describe("eventos idempotentes", () => {
  const e = makeEvent("org1", "sketch.acquisition_source.created", { code: "SK-CLUBES-AB12", channelKey: "clubes" }, "SK-CLUBES-AB12");
  it("o mesmo fato gera o mesmo id", () => {
    expect(makeEvent("org1", "sketch.acquisition_source.created", { code: "SK-CLUBES-AB12", channelKey: "clubes" }, "SK-CLUBES-AB12").id).toBe(e.id);
  });
  it("processar duas vezes não duplica nada", () => {
    const h = (s: string[], ev: typeof e) => [...s, ev.payload.code];
    const first = consumeOnce<string[]>([], new Set(), "mz", [e, e], h as never);
    expect(first.state).toEqual(["SK-CLUBES-AB12"]);
    const second = consumeOnce(first.state, first.processed, "mz", [e], h as never);
    expect(second.applied).toBe(0);
    expect(second.state).toEqual(["SK-CLUBES-AB12"]);
  });
  it("evento não carrega dado pessoal", () => {
    expect(() => makeEvent("org1", "mz.customer_voice.classified", { week: "2026-11-16", categories: [{ category: "x", label: "x", count: 1, excerpts: ["me liga 21999990001"] }] }, "k")).toThrow();
    expect(() => makeEvent("org1", "mz.customer_voice.classified", { week: "2026-11-16", categories: [{ category: "x", label: "x", count: 1, excerpts: ["ana@example.com"] }] }, "k")).toThrow();
  });
  it("um pedido com código de origem é atribuído uma vez só", () => {
    let m = new Map<string, string>();
    const a = attributeOnce(m, "o1", "SK-A");
    m = a.map;
    const b = attributeOnce(m, "o1", "SK-B");
    expect(a.created).toBe(true);
    expect(b.created).toBe(false);
    expect(b.map.get("o1")).toBe("SK-A");
  });
});

describe("códigos de origem", () => {
  const oc = makeOriginCode({ orgId: "org1", storeUrl: "https://example.com/loja", channelKey: "clubes", missionKey: "m2" });
  it("UTM, código de indicação e QR", () => {
    expect(oc.code).toMatch(/^SK-CLUBES-[0-9A-Z]{4}$/);
    expect(oc.utmUrl).toContain("utm_source=sketch");
    expect(oc.utmUrl).toContain("utm_campaign=clubes");
    expect(oc.qrPayload).toBe(oc.utmUrl);
    expect(makeOriginCode({ orgId: "org1", storeUrl: "https://example.com/loja", channelKey: "clubes", missionKey: "m2" }).code).toBe(oc.code);
  });
  it("extrai o código do pedido (link, cupom ou 'como conheceu')", () => {
    const known = new Set([oc.code]);
    expect(extractSourceCode({ landingUrl: oc.utmUrl }, known)).toBe(oc.code);
    expect(extractSourceCode({ coupon: oc.code.toLowerCase() }, known)).toBe(oc.code);
    expect(extractSourceCode({ howFound: "instagram" }, known)).toBeNull();
  });
});

describe("recompra por canal de origem (fixture conhecida)", () => {
  // Clubes trouxeram 23; 9 voltaram. Nutricionistas trouxeram 12; 1 voltou. (Integracao.md, seção 3)
  const customers: Customer[] = [];
  const orders: Order[] = [];
  const add = (code: string, n: number, back: number, firstDate: string, secondDate: string) => {
    for (let i = 0; i < n; i++) {
      const id = `${code}-${i}`;
      customers.push({ id, name: id });
      orders.push({ id: `${id}-1`, customerId: id, date: firstDate, totalCents: 15_000, sourceCode: code });
      if (i < back) orders.push({ id: `${id}-2`, customerId: id, date: secondDate, totalCents: 15_000 });
    }
  };
  add("SK-CLUBES", 23, 9, "2026-08-01", "2026-09-10");
  add("SK-NUTRIS", 12, 1, "2026-08-01", "2026-10-15");
  const c = repurchaseBySource(customers, orders, "2026-11-16");
  it("conta adquiridas e recompra em 60/90 dias", () => {
    const clubes = c.find((x) => x.sourceCode === "SK-CLUBES")!;
    expect(clubes).toMatchObject({ acquired: 23, returned: 9, repurchased60: 9, repurchased90: 9 });
    expect(clubes.rate60).toBeCloseTo(9 / 23);
    const nutris = c.find((x) => x.sourceCode === "SK-NUTRIS")!;
    expect(nutris).toMatchObject({ acquired: 12, returned: 1, repurchased60: 0, repurchased90: 1 });
    expect(nutris.partialLtvCents).toBe(Math.round((12 * 15_000 + 15_000) / 12));
  });
  it("canal que traz quem volta sobe; o outro vira hipótese", () => {
    const seed = carlaSketchSeed();
    const r = reprioritizeChannels(seed.channels, new Map([["clubes", { acquired: 23, returned: 9 }], ["nutris", { acquired: 12, returned: 1 }]]));
    const clubes = r.find((x) => x.channelKey === "clubes")!;
    const nutris = r.find((x) => x.channelKey === "nutris")!;
    expect(clubes.newPriority).toBe(4);
    expect(clubes.status).toBe("fato");
    expect(clubes.sentence).toBe("Clubes de corrida do Rio trouxeram 23 clientes; 9 já voltaram.");
    expect(nutris.newPriority).toBe(3);
    expect(nutris.status).toBe("hipotese");
    expect(r.find((x) => x.channelKey === "provas")!.status).toBe("sem_info");
  });
});

describe("Sketch: citações rastreáveis e terreno", () => {
  it("toda frase da persona existe nas fontes, com contagem do protótipo", () => {
    const j = joaoSeed();
    expect(j.persona.expressions.map((q) => q.count)).toEqual([52, 37, 29, 18]);
    expect(j.docs).toHaveLength(416);
    const c = carlaSketchSeed();
    expect(c.persona.expressions.map((q) => q.count)).toEqual([64, 41, 28, 22]);
    expect(c.docs).toHaveLength(412);
    for (const q of [...j.persona.expressions, ...c.persona.expressions]) expect(q.sources.length).toBeGreaterThan(0);
  });
  it("frase inventada é rejeitada", () => {
    const { verified, rejected } = verifyExpressions(carlaSketchSeed().docs, ["não pesa no estômago", "mudou a minha vida"]);
    expect(verified.map((v) => v.text)).toEqual(["não pesa no estômago"]);
    expect(rejected).toEqual(["mudou a minha vida"]);
  });
  it("espaço vazio = coluna que ninguém ocupa e coincide com a dor", () => {
    const c = carlaSketchSeed();
    expect(findEmptySpace(c.matrix, [c.persona.pain, c.persona.desire])).toBe(3);
    const j = joaoSeed();
    expect(findEmptySpace(j.matrix, [j.persona.pain])).toBe(3);
  });
  it("toda célula da matriz tem URL, data e trecho", () => {
    for (const s of [joaoSeed(), carlaSketchSeed()]) for (const r of s.matrix.rows) for (const cell of r.cells) expect(cell.evidence).toMatchObject({ url: expect.stringMatching(/^https:/), collectedAt: expect.any(String), excerpt: expect.any(String) });
  });
  it("proibido monitorar preço", () => {
    expect(() => assertNoPriceColumns(["Quem cobra menos"])).toThrow();
    expect(() => assertNoPriceColumns(["Preço médio do whey"])).toThrow();
    expect(() => assertNoPriceColumns(joaoSeed().matrix.columns)).not.toThrow();
  });
  it("teste de tráfego exige verba, prazo, mensagem e regra de parada", () => {
    expect(validateTrafficTest(carlaSketchSeed().traffic)).toEqual([]);
    expect(validateTrafficTest({ budgetCents: 0, days: 0, message: "", stopRule: "", phase: "pronto", status: "hipotese" })).toHaveLength(4);
  });
});

describe("sugestões de degrau", () => {
  it("Sketch → Marco Zero quando há clientes voltando (38 com contato, 7 com 2 compras)", () => {
    expect(shouldSuggestMarcoZero({ withContact: 38, repeatBuyers: 7 })).toBe(true);
    expect(shouldSuggestMarcoZero({ withContact: 10, repeatBuyers: 1 })).toBe(false);
  });
  it("recusou: só volta depois de 60 dias", () => {
    expect(canShow("sketch_para_mz", { key: "sketch_para_mz", shownAt: "2026-11-01", dismissedAt: "2026-11-01" }, "2026-12-30")).toBe(false);
    expect(canShow("sketch_para_mz", { key: "sketch_para_mz", shownAt: "2026-11-01", dismissedAt: "2026-11-01" }, "2026-12-31")).toBe(true);
  });
  it("gatilho de Início → Completo aparece uma vez e some se recusar", () => {
    expect(canShow("sketch_inicio_para_completo:trafego", undefined, "2026-11-16")).toBe(true);
    expect(canShow("sketch_inicio_para_completo:trafego", { key: "sketch_inicio_para_completo:trafego", shownAt: "2026-11-16" }, "2026-11-17")).toBe(false);
    expect(canShow("sketch_inicio_para_completo:trafego", { key: "sketch_inicio_para_completo:trafego", shownAt: "2026-11-16", dismissedAt: "2026-11-16" }, "2027-11-17")).toBe(false);
  });
  it("Marco Zero → Sketch quando a receita alugada passa de 70% por 2 meses", () => {
    expect(shouldSuggestSketch([0.6, 0.72, 0.75])).toBe(true);
    expect(shouldSuggestSketch([0.72, 0.69])).toBe(false);
  });
});
