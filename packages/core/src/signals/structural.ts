/**
 * Ponte para o ECOM: um sinal que se repete por 3 semanas seguidas e está fora
 * do alcance de uma missão vira GARGALO ESTRUTURAL.
 */
export interface WeeklySignal {
  week: string; // yyyy-mm-dd da segunda-feira
  type: string; // frete | preco | produto | operacao | missao_travada
}

export const STRUCTURAL_TYPES = ["frete", "preco", "produto", "operacao", "missao_travada"] as const;

export const SIGNAL_LABEL: Record<string, string> = {
  frete: "Queixa de frete",
  preco: "Queixa de preço",
  produto: "Queixa de produto",
  operacao: "Problema de operação",
  missao_travada: "Missões que travam",
};

export const STRUCTURAL_MESSAGE = "Se isso aparecer por três semanas seguidas, deixa de ser uma missão. Vira um assunto de estrutura.";

function prevWeek(week: string): string {
  const d = new Date(week + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 7);
  return d.toISOString().slice(0, 10);
}

export function detectStructural(signals: WeeklySignal[], currentWeek: string, runLength = 3): { type: string; weeks: string[] }[] {
  const byType = new Map<string, Set<string>>();
  for (const s of signals) {
    if (!(STRUCTURAL_TYPES as readonly string[]).includes(s.type)) continue;
    if (!byType.has(s.type)) byType.set(s.type, new Set());
    byType.get(s.type)!.add(s.week);
  }
  const out: { type: string; weeks: string[] }[] = [];
  for (const [type, weeks] of byType) {
    const run: string[] = [];
    let w = currentWeek;
    while (weeks.has(w)) {
      run.unshift(w);
      w = prevWeek(w);
    }
    if (run.length >= runLength) out.push({ type, weeks: run });
  }
  return out;
}

/** Segunda-feira da semana de uma data (yyyy-mm-dd). */
export function weekStart(iso: string): string {
  const d = new Date(iso.slice(0, 10) + "T00:00:00Z");
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}
