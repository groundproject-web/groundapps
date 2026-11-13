import type { Quote, SourceRef } from "./model";

/**
 * Regra do Sketch: as frases mostradas têm de ser CITAÇÕES REAIS das fontes lidas.
 * A IA pode propor expressões; este módulo confere cada uma contra o texto das fontes,
 * conta as ocorrências e guarda a referência de origem. Frase sem fonte é descartada.
 */
export interface SourceDoc {
  id: string;
  text: string;
  source: Omit<SourceRef, "ref" | "excerpt">;
}

export function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[“”"'.,!?;:()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function countExpression(docs: SourceDoc[], phrase: string, maxSources = 5): Quote | null {
  const p = normalizeText(phrase);
  if (!p) return null;
  const hits = docs.filter((d) => normalizeText(d.text).includes(p));
  if (!hits.length) return null;
  return {
    text: phrase,
    count: hits.length,
    sources: hits.slice(0, maxSources).map((d) => ({ ...d.source, ref: d.id, excerpt: d.text.slice(0, 200) })),
  };
}

/** Confere as expressões propostas: só ficam as que aparecem nas fontes, com contagem. */
export function verifyExpressions(docs: SourceDoc[], proposed: string[]): { verified: Quote[]; rejected: string[] } {
  const verified: Quote[] = [];
  const rejected: string[] = [];
  for (const p of proposed) {
    const q = countExpression(docs, p);
    if (q) verified.push(q);
    else rejected.push(p);
  }
  verified.sort((a, b) => b.count - a.count);
  return { verified, rejected };
}
