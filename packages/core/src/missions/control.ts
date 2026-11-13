import { hash32, rng } from "../util";

/**
 * Grupo de comparação automático: sorteia ~15% da lista (configurável) para ficar de fora.
 * Determinístico pela semente (id da missão), para o sorteio ser reprodutível e auditável.
 */
export interface ControlSplit {
  recipients: string[];
  control: string[];
}

export function splitControlGroup(customerIds: string[], seed: string, controlPct = 15): ControlSplit {
  const ids = [...customerIds].sort();
  const r = rng(hash32(seed));
  // Fisher–Yates determinístico
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  const n = Math.round((ids.length * Math.min(50, Math.max(0, controlPct))) / 100);
  const control = ids.slice(0, n).sort();
  const recipients = ids.slice(n).sort();
  return { recipients, control };
}

export function controlSentence(controlCount: number): string {
  return `Separamos ${controlCount} clientes para comparar. Não mande para elas.`;
}
