/**
 * Gamificação (PROPOSTA — aguarda o aval dos sócios; desligada por padrão).
 * Premia o uso que gera resultado, não o volume de compra.
 */
export interface TerrainLevel {
  key: "alugado" | "marcado" | "fundacao" | "construido";
  name: string;
  min: number; // fração 0..1
  stroke: "tracejado" | "tracejado-denso" | "solido-fino" | "solido";
}

export const TERRAIN_LEVELS: TerrainLevel[] = [
  { key: "alugado", name: "Terreno alugado", min: 0, stroke: "tracejado" },
  { key: "marcado", name: "Terreno marcado", min: 0.2, stroke: "tracejado-denso" },
  { key: "fundacao", name: "Fundação", min: 0.35, stroke: "solido-fino" },
  { key: "construido", name: "Terreno construído", min: 0.5, stroke: "solido" },
];

/** < 20% alugado · 20–35% marcado · 35–50% fundação · > 50% construído */
export function terrainLevel(builtShare: number): TerrainLevel {
  let lvl = TERRAIN_LEVELS[0];
  for (const l of TERRAIN_LEVELS) {
    if (l.key === "construido" ? builtShare > l.min : builtShare >= l.min) lvl = l;
  }
  return lvl;
}

/** Sequência de check-ins respondidos (semanas consecutivas até a mais recente). */
export function checkinStreak(weeks: { week: string; answered: boolean }[]): number {
  const sorted = [...weeks].sort((a, b) => b.week.localeCompare(a.week));
  let n = 0;
  for (const w of sorted) {
    if (!w.answered) break;
    n++;
  }
  return n;
}

export function missionBadge(title: string, extraOrders: number): string {
  return `${title} · +${extraOrders} pedidos`;
}
