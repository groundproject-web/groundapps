/**
 * Aprendizados: a memória da loja.
 * Regras:
 * - funcionou 1 vez com comparação válida → fato · testado 1×
 * - repetiu com sucesso → o contador sobe
 * - falhou em 2 testes → descartado
 * - ajustado depois de travar → ajustado
 */
export type LearningState = "fato" | "hipotese" | "ajustado" | "descartado" | "sem_info";

export const LEARNING_STATE_LABEL: Record<LearningState, string> = {
  fato: "Fato",
  hipotese: "Hipótese",
  ajustado: "Ajustado",
  descartado: "Descartado",
  sem_info: "Sem informação",
};

export interface LearningEvent {
  at: string;
  missionId?: string;
  kind: "criado" | "sucesso" | "falha" | "ajustado" | "observado";
  note?: string;
  from: LearningState;
  to: LearningState;
}

export interface Learning {
  key: string;
  sentence: string;
  state: LearningState;
  successes: number;
  failures: number;
  /** contador de recorrência (testes bem-sucedidos ou semanas observadas) */
  recurrence: number;
  evidenceMissionIds: string[];
  history: LearningEvent[];
  kind: "mensagem" | "horario" | "grupo" | "sinal" | "bloqueio";
}

export function newLearning(key: string, sentence: string, kind: Learning["kind"], at: string, state: LearningState = "hipotese"): Learning {
  return {
    key,
    sentence,
    state,
    successes: 0,
    failures: 0,
    recurrence: 0,
    evidenceMissionIds: [],
    history: [{ at, kind: "criado", from: "sem_info", to: state }],
    kind,
  };
}

function push(l: Learning, ev: Omit<LearningEvent, "from" | "to">, to: LearningState): Learning {
  const evidence = ev.missionId && !l.evidenceMissionIds.includes(ev.missionId) ? [...l.evidenceMissionIds, ev.missionId] : l.evidenceMissionIds;
  return { ...l, state: to, evidenceMissionIds: evidence, history: [...l.history, { ...ev, from: l.state, to }] };
}

export function recordOutcome(l: Learning, outcome: "sucesso" | "falha", opts: { validComparison: boolean; missionId: string; at: string; note?: string }): Learning {
  if (l.state === "descartado") return l;
  // idempotência: a mesma missão não conta duas vezes
  if (l.history.some((h) => h.missionId === opts.missionId && (h.kind === "sucesso" || h.kind === "falha"))) return l;
  if (outcome === "sucesso") {
    const next = { ...l, successes: l.successes + 1, recurrence: l.recurrence + 1 };
    const to: LearningState = opts.validComparison ? "fato" : l.state === "fato" ? "fato" : "hipotese";
    return push(next, { at: opts.at, missionId: opts.missionId, kind: "sucesso", note: opts.note }, to);
  }
  const next = { ...l, failures: l.failures + 1 };
  const to: LearningState = next.failures >= 2 ? "descartado" : l.state === "fato" ? "hipotese" : l.state;
  return push(next, { at: opts.at, missionId: opts.missionId, kind: "falha", note: opts.note }, to);
}

export function markAdjusted(l: Learning, opts: { at: string; missionId?: string; note?: string }): Learning {
  if (l.state === "descartado") return l;
  return push(l, { at: opts.at, missionId: opts.missionId, kind: "ajustado", note: opts.note }, "ajustado");
}

export function observe(l: Learning, opts: { at: string; missionId?: string; note?: string }): Learning {
  return push({ ...l, recurrence: l.recurrence + 1 }, { at: opts.at, missionId: opts.missionId, kind: "observado", note: opts.note }, l.state === "sem_info" ? "hipotese" : l.state);
}

export function learningBadge(l: Learning): string {
  switch (l.state) {
    case "fato":
      return `Fato · testado ${l.successes}×`;
    case "hipotese":
      return l.recurrence > 0 ? `Hipótese · ${l.recurrence}ª semana · observar` : "Hipótese · testar";
    case "ajustado":
      return "Ajustado";
    case "descartado":
      return "Descartado";
    default:
      return "Sem informação";
  }
}
