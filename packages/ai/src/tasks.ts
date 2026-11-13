import type Anthropic from "@anthropic-ai/sdk";
import { classifyRepliesOffline, proposeMapping, verifyExpressions, type SourceDoc, type Quote } from "@ground/core";
import type { AiClient, UsageSink } from "./client";
import { competitorResearchV1, mappingV1, missionCopyV1, personaV1, replyClassifierV1 } from "./prompts";
import { CompetitorResearchSchema, MappingProposalSchema, MissionCopySchema, PersonaProposalSchema, ReplyClassesSchema, type CompetitorResearch } from "./schemas";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { costMicros, MODELS } from "./models";

/** Mascara dado pessoal antes de mandar amostras para a IA. */
export function maskSample(v: string): string {
  return v
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[e-mail]")
    .replace(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g, "[documento]")
    .replace(/\+?\(?\d[\d\s()-]{8,}\d/g, "[telefone]")
    .replace(/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+(\s[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wáéíóúâêôãõç.]+)+$/, "[nome]");
}

export async function aiProposeMapping(ai: AiClient, orgId: string, headers: string[], sampleRows: string[][]) {
  const masked = sampleRows.slice(0, 3).map((r) => r.map(maskSample));
  return ai.run({
    orgId,
    prompt: mappingV1,
    schema: MappingProposalSchema,
    effort: "low",
    content: `Cabeçalhos: ${JSON.stringify(headers)}\nExemplos (mascarados): ${JSON.stringify(masked)}`,
    offline: () => ({ columns: proposeMapping(headers).map((m) => ({ header: m.header, target: m.target, reason: m.target === "sensivel" ? "Dado sensível: descartado" : m.target === "ignorado" ? "Não serve para medir recompra" : "Reconhecido pelo nome da coluna" })), status: "fato" as const }),
  });
}

export async function aiMissionCopy(ai: AiClient, orgId: string, input: { draft: string; why: string[]; persona?: { profile: string; quotes: string[] } | null; blocker?: string | null; owner: string; store: string }) {
  return ai.run({
    orgId,
    prompt: missionCopyV1,
    schema: MissionCopySchema,
    effort: "medium",
    content: JSON.stringify(input),
    offline: () => ({ message: input.draft, why: input.why.slice(0, 4), status: "hipotese" as const }),
  });
}

/** Classifica respostas: texto colado e/ou prints (visão). Áudio entra como transcrição. */
export async function aiClassifyReplies(ai: AiClient, orgId: string, input: { texts: string[]; images: { mediaType: "image/png" | "image/jpeg" | "image/webp"; base64: string }[] }) {
  const content: Anthropic.Beta.BetaContentBlockParam[] = [
    ...input.images.map((i) => ({ type: "image" as const, source: { type: "base64" as const, media_type: i.mediaType, data: i.base64 } })),
    { type: "text", text: `Respostas em texto:\n${input.texts.map((t, i) => `${i + 1}. ${t}`).join("\n") || "(nenhuma)"}` },
  ];
  return ai.run({
    orgId,
    prompt: replyClassifierV1,
    schema: ReplyClassesSchema,
    effort: "low",
    content,
    offline: () => {
      const c = classifyRepliesOffline(input.texts);
      return { categories: c.map(({ category, label, count, excerpts }) => ({ category, label, count, excerpts })), totalReplies: input.texts.length, status: "hipotese" as const };
    },
  });
}

/**
 * Persona: a IA propõe, o código confere. Só ficam as frases encontradas nas fontes.
 */
export async function aiPersona(ai: AiClient, orgId: string, docs: SourceDoc[], fromRepeatBuyers: boolean, offlineDraft: { profile: string; description: string; expressions: string[]; pain: string; desire: string; motive: string }) {
  const numbered = docs.slice(0, 600).map((d, i) => `[${i + 1}] ${d.text}`).join("\n");
  const r = await ai.run({
    orgId,
    prompt: personaV1,
    schema: PersonaProposalSchema,
    effort: "medium",
    content: `Fontes (${docs.length}; ${fromRepeatBuyers ? "clientes que recompram" : "público e marcas parecidas"}):\n${numbered}`,
    offline: () => ({ ...offlineDraft, status: fromRepeatBuyers ? ("fato" as const) : ("hipotese" as const) }),
  });
  const { verified, rejected } = verifyExpressions(docs, r.data.expressions);
  const status = fromRepeatBuyers && r.data.status === "fato" ? ("fato" as const) : ("hipotese" as const);
  return { ...r, persona: { ...r.data, status }, quotes: verified as Quote[], rejected };
}

/**
 * Agente de pesquisa de concorrência (PRD Sketch 2.3.1).
 * Busca e leitura de páginas públicas pela API da Anthropic. DESLIGADO por padrão:
 * só roda com RESEARCH_ENABLED=1 e chave da API — fontes novas precisam do aval dos sócios.
 */
export async function aiCompetitorResearch(client: Anthropic | null, sink: UsageSink, input: { orgId: string; category: string; persona: string; region: string; knownCompetitors: string[]; attributes: string[] }): Promise<CompetitorResearch | null> {
  if (!client || process.env.RESEARCH_ENABLED !== "1") return null;
  const today = new Date().toISOString().slice(0, 10);
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    { role: "user", content: `Data de hoje: ${today}. Categoria: ${input.category}. Cliente: ${input.persona}. Região: ${input.region}. Concorrentes que o lojista conhece: ${input.knownCompetitors.join(", ") || "nenhum"}. Atributos a checar: ${input.attributes.join(", ")}. Encontre de 3 a 6 concorrentes de porte parecido.` },
  ];
  let inTok = 0;
  let outTok = 0;
  let searches = 0;
  for (let turn = 0; turn < 6; turn++) {
    const res = await client.beta.messages.parse({
      model: MODELS.principal,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: competitorResearchV1.system,
      output_config: { effort: "high", format: betaZodOutputFormat(CompetitorResearchSchema) },
      tools: [
        { type: "web_search_20260209", name: "web_search", max_uses: 12, user_location: { type: "approximate", country: "BR" } },
        { type: "web_fetch_20260209", name: "web_fetch", max_uses: 15 },
      ],
      messages,
    });
    inTok += res.usage.input_tokens;
    outTok += res.usage.output_tokens;
    searches += res.usage.server_tool_use?.web_search_requests ?? 0;
    if (res.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: res.content as Anthropic.Beta.BetaContentBlockParam[] });
      continue;
    }
    await sink({ orgId: input.orgId, feature: competitorResearchV1.id, promptVersion: competitorResearchV1.version, model: res.model, inputTokens: inTok, outputTokens: outTok, costUsdMicros: costMicros(res.model, inTok, outTok, searches), offline: false });
    if (res.stop_reason === "refusal" || !res.parsed_output) return null;
    // regra: afirmação sem fonte vira sem_info
    const out = res.parsed_output;
    for (const c of out.competitors) {
      for (const p of c.promises) if (!p.evidence) Object.assign(p, { promises: null, status: "sem_info" });
      for (const ch of c.channels) if (!ch.evidence) ch.status = "sem_info";
      for (const cp of c.complaints) if (!cp.evidence) cp.status = "sem_info";
    }
    return out;
  }
  return null;
}
