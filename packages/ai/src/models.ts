/**
 * Modelos e preços (USD por milhão de tokens). Fonte: tabela da API da Anthropic, nov/2026.
 * Os preços mudam: confira antes de produção e ajuste aqui (ou mova para o /admin).
 */
export const MODELS = {
  /** padrão: melhor qualidade para missão, persona e pesquisa */
  principal: "claude-opus-5-5",
} as const;

export const PRICES_USD_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
};

/** Busca na web: cobrada por uso, além dos tokens. Valor configurável. */
export const WEB_SEARCH_USD_PER_1K = 10;

export function costMicros(model: string, inputTokens: number, outputTokens: number, webSearches = 0): number {
  const p = PRICES_USD_PER_MTOK[model] ?? PRICES_USD_PER_MTOK[MODELS.principal];
  const usd = (inputTokens / 1e6) * p.input + (outputTokens / 1e6) * p.output + (webSearches / 1000) * WEB_SEARCH_USD_PER_1K;
  return Math.round(usd * 1e6);
}
