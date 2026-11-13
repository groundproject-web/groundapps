import { addDays } from "./util";

/**
 * Sugestões de subir de degrau e de combo. Cada gatilho aparece uma vez;
 * se o lojista recusar, some (ou volta depois de N dias, quando a regra diz).
 * Nunca trate um app como isca para outro: a sugestão é informativa, sem pressão.
 */
export type SuggestionKey = "sketch_para_mz" | "mz_para_sketch" | "sketch_inicio_para_completo:trafego" | "sketch_inicio_para_completo:espaco_validado" | "sketch_inicio_para_completo:terreno_desatualizado";

export interface SuggestionMemory {
  key: SuggestionKey;
  shownAt?: string;
  dismissedAt?: string;
  acceptedAt?: string;
}

const SNOOZE_DAYS: Partial<Record<SuggestionKey, number>> = { sketch_para_mz: 60 };

export function canShow(key: SuggestionKey, mem: SuggestionMemory | undefined, today: string): boolean {
  if (!mem) return true;
  if (mem.acceptedAt) return false;
  if (mem.dismissedAt) {
    const snooze = SNOOZE_DAYS[key];
    return snooze !== undefined && today >= addDays(mem.dismissedAt, snooze);
  }
  return !mem.shownAt; // uma vez por gatilho
}

/** Sketch sozinho com clientes voltando (ex.: 38 com contato, 7 com 2 compras). */
export function shouldSuggestMarcoZero(stats: { withContact: number; repeatBuyers: number }): boolean {
  return stats.withContact >= 30 && stats.repeatBuyers >= 5;
}

/** Marco Zero sozinho: receita alugada > 70% por 2 meses seguidos. */
export function shouldSuggestSketch(monthlyRentedShare: number[]): boolean {
  const last2 = monthlyRentedShare.slice(-2);
  return last2.length === 2 && last2.every((s) => s > 0.7);
}
