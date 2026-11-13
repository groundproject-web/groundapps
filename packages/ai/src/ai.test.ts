import { describe, expect, it } from "vitest";
import { carlaSketchSeed } from "@ground/core/seeds";
import { AiClient, type UsageRecord } from "./client";
import { aiClassifyReplies, aiPersona, aiProposeMapping, maskSample } from "./tasks";
import { costMicros } from "./models";

describe("IA em modo offline (demo, sem chave)", () => {
  const log: UsageRecord[] = [];
  const ai = new AiClient((r) => void log.push(r), { forceOffline: true });

  it("mapeamento descarta CPF e registra custo zero por organização", async () => {
    const r = await aiProposeMapping(ai, "org1", ["Nome do comprador", "CPF", "Total pago", "Data do pedido"], [["Ana Prado", "111.222.333-44", "R$ 10", "01/01/2026"]]);
    expect(r.data.columns.find((c) => c.header === "CPF")!.target).toBe("sensivel");
    expect(r.data.status).toBe("fato");
    expect(log.at(-1)).toMatchObject({ orgId: "org1", feature: "mapping", promptVersion: "mapping.v1", offline: true, costUsdMicros: 0 });
  });

  it("classificação de respostas é hipótese", async () => {
    const r = await aiClassifyReplies(ai, "org1", { texts: ["manda o link", "frete caro"], images: [] });
    expect(r.data.status).toBe("hipotese");
    expect(r.data.totalReplies).toBe(2);
  });

  it("persona: frase inventada pela IA é descartada", async () => {
    const seed = carlaSketchSeed();
    const r = await aiPersona(ai, "org1", seed.docs, true, { profile: "x", description: "x", expressions: ["não pesa no estômago", "frase inventada"], pain: "x", desire: "x", motive: "x" });
    expect(r.quotes.map((q) => q.text)).toEqual(["não pesa no estômago"]);
    expect(r.rejected).toEqual(["frase inventada"]);
    expect(r.persona.status).toBe("fato");
  });
});

describe("custo", () => {
  it("Opus 5.5: US$ 4 / 20 por milhão", () => {
    expect(costMicros("claude-opus-5-5", 1_000_000, 100_000)).toBe(6_000_000);
  });
});

describe("mascaramento antes de mandar amostra", () => {
  it.each([
    ["ana@example.com", "[e-mail]"],
    ["111.222.333-44", "[documento]"],
    ["(21) 99999-0001", "[telefone]"],
    ["Ana Prado", "[nome]"],
    ["R$ 10,00", "R$ 10,00"],
  ])("%s → %s", (i, o) => expect(maskSample(i)).toBe(o));
});
