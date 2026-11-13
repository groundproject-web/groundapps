export const DAY_MS = 86_400_000;

/** Converte "yyyy-mm-dd" em dia absoluto (UTC), para diferenças exatas. */
export function dayNumber(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
}

export function daysBetween(a: string, b: string): number {
  return dayNumber(b) - dayNumber(a);
}

export function addDays(iso: string, days: number): string {
  const n = dayNumber(iso) + days;
  return new Date(n * DAY_MS).toISOString().slice(0, 10);
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

/** Últimos N meses (yyyy-mm), terminando no mês de `asOf`, em ordem cronológica. */
export function lastMonths(asOf: string, n: number): string[] {
  const [y, m] = asOf.slice(0, 7).split("-").map(Number);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function round(v: number, digits = 0): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}

/** PRNG determinístico (mulberry32) — usado em seeds e sorteio do grupo de comparação. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash FNV-1a de 32 bits, para derivar seeds e códigos estáveis a partir de texto. */
export function hash32(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function formatBRL(cents: number, opts: { decimals?: boolean } = {}): string {
  const v = cents / 100;
  return (
    "R$ " +
    v.toLocaleString("pt-BR", {
      minimumFractionDigits: opts.decimals ? 2 : 0,
      maximumFractionDigits: opts.decimals ? 2 : 0,
    })
  );
}

export function formatInt(n: number): string {
  return Math.round(n).toLocaleString("pt-BR");
}

export function pct(v: number, digits = 0): string {
  return `${round(v * 100, digits).toLocaleString("pt-BR")}%`;
}
