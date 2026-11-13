import type { SendStatus } from "./attribution";

export type Blocker = "tempo" | "contato" | "receio";

export const BLOCKER_LABEL: Record<Blocker, string> = {
  tempo: "Faltou tempo",
  contato: "Não tinha o contato de todas",
  receio: "Fiquei com receio de incomodar",
};

export const SEND_LABEL: Record<SendStatus, string> = {
  todas: "Mandei para todas",
  parte: "Mandei para uma parte",
  nenhuma: "Não consegui",
};

/** O que o lojista conta no check-in. É guardado como HIPÓTESE. */
export interface CheckinAnswers {
  sendStatus: SendStatus;
  sentCount?: number;
  recipients?: string[];
  blocker?: Blocker;
  blockerNote?: string;
  replies?: ReplyClassification[];
}

/** Categorias livres; estas são as sementes conhecidas. */
export const REPLY_CATEGORIES: Record<string, { label: string; patterns: RegExp[]; signal?: string }> = {
  pediu_link: { label: "Pediu o link", patterns: [/link/, /manda/, /quero/, /reserva/, /pode mandar/] },
  frete: { label: "Reclamação de frete", patterns: [/frete/, /entrega/, /envio caro/], signal: "frete" },
  preco: { label: "Achou caro", patterns: [/caro/, /preco/, /preço/, /desconto/], signal: "preco" },
  sabor_novo: { label: "Pedido de sabor novo", patterns: [/sabor/, /chocolate/, /baunilha/, /morango/] },
  comprou_fora: { label: "Comprou em outro lugar", patterns: [/comprei na/, /loja fisica/, /loja física/, /academia/, /mercado livre/] },
  produto: { label: "Queixa do produto", patterns: [/estragad/, /vencid/, /nao gostei/, /não gostei/, /passou mal/], signal: "produto" },
  sem_interesse: { label: "Sem interesse", patterns: [/nao quero/, /não quero/, /para de mandar/, /sem interesse/, /nao preciso/, /não preciso/] },
};

export interface ReplyClassification {
  category: string;
  label: string;
  count: number;
  /** trechos sem nome de cliente */
  excerpts: string[];
  status: "hipotese";
}

/** Remove nomes próprios e telefones dos trechos (LGPD: guardar só o resumo). */
export function scrubExcerpt(text: string): string {
  return text
    .replace(/\(?\d{2}\)?\s?9?\s?\d{4}[-\s]?\d{4}/g, "[telefone]")
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[e-mail]")
    .replace(/^(\s*)([A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+)(\s*[:,-])/g, "$1[cliente]$3")
    .slice(0, 160);
}

/** Classificação determinística (fallback sem IA, e base de teste). */
export function classifyRepliesOffline(replies: string[]): ReplyClassification[] {
  const map = new Map<string, ReplyClassification>();
  for (const raw of replies) {
    const t = raw.toLowerCase();
    const key = Object.entries(REPLY_CATEGORIES).find(([, c]) => c.patterns.some((p) => p.test(t)))?.[0] ?? "outros";
    const label = REPLY_CATEGORIES[key]?.label ?? "Outros";
    if (!map.has(key)) map.set(key, { category: key, label, count: 0, excerpts: [], status: "hipotese" });
    const c = map.get(key)!;
    c.count++;
    if (c.excerpts.length < 3) c.excerpts.push(scrubExcerpt(raw));
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

/** Sinais que podem virar gargalo estrutural (frete, preço, produto, operação). */
export function signalsFromReplies(classes: ReplyClassification[], minCount = 3): string[] {
  return classes.filter((c) => REPLY_CATEGORIES[c.category]?.signal && c.count >= minCount).map((c) => REPLY_CATEGORIES[c.category].signal!);
}
