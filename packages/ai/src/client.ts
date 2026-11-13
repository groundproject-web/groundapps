import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod/v4";
import { costMicros, MODELS } from "./models";
import type { PromptDef } from "./prompts";

/**
 * Cliente único de IA da plataforma.
 * - Saída em JSON validada com Zod (structured outputs).
 * - Registra custo por chamada e por organização (UsageSink → tabela ai_usage).
 * - Sem ANTHROPIC_API_KEY (modo demo), roda o `offline` determinístico e registra custo zero.
 * - Fallback de recusa no servidor ligado (`fallbacks: "default"`).
 */
export interface UsageRecord {
  orgId: string | null;
  feature: string;
  promptVersion: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsdMicros: number;
  offline: boolean;
}

export type UsageSink = (r: UsageRecord) => Promise<void> | void;

export type UserContent = string | Anthropic.Beta.BetaContentBlockParam[];

export interface RunParams<S extends z.ZodType> {
  orgId: string | null;
  prompt: PromptDef;
  schema: S;
  content: UserContent;
  offline: () => z.infer<S>;
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
}

export interface RunResult<T> {
  data: T;
  offline: boolean;
  usage: UsageRecord;
}

export class AiRefusalError extends Error {}

export class AiClient {
  private client: Anthropic | null;
  constructor(
    private sink: UsageSink,
    opts: { apiKey?: string | null; forceOffline?: boolean } = {},
  ) {
    const key = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;
    this.client = key && !opts.forceOffline ? new Anthropic({ apiKey: key }) : null;
  }

  get isOnline() {
    return this.client !== null;
  }

  async run<S extends z.ZodType>(p: RunParams<S>): Promise<RunResult<z.infer<S>>> {
    if (!this.client) {
      const data = p.schema.parse(p.offline()) as z.infer<S>;
      const usage: UsageRecord = { orgId: p.orgId, feature: p.prompt.id, promptVersion: p.prompt.version, model: "offline", inputTokens: 0, outputTokens: 0, costUsdMicros: 0, offline: true };
      await this.sink(usage);
      return { data, offline: true, usage };
    }
    const model = MODELS.principal;
    const response = await this.client.beta.messages.parse({
      model,
      max_tokens: p.maxTokens ?? 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [{ type: "text", text: p.prompt.system, cache_control: { type: "ephemeral" } }],
      output_config: { effort: p.effort ?? "medium", format: betaZodOutputFormat(p.schema) },
      messages: [{ role: "user", content: p.content }],
    });
    const usage: UsageRecord = {
      orgId: p.orgId,
      feature: p.prompt.id,
      promptVersion: p.prompt.version,
      model: response.model,
      inputTokens: response.usage.input_tokens + (response.usage.cache_read_input_tokens ?? 0) + (response.usage.cache_creation_input_tokens ?? 0),
      outputTokens: response.usage.output_tokens,
      costUsdMicros: costMicros(response.model, response.usage.input_tokens + (response.usage.cache_creation_input_tokens ?? 0) * 1.25 + (response.usage.cache_read_input_tokens ?? 0) * 0.1, response.usage.output_tokens),
      offline: false,
    };
    await this.sink(usage);
    if (response.stop_reason === "refusal") throw new AiRefusalError("A IA recusou o pedido.");
    if (!response.parsed_output) throw new Error("Saída da IA fora do formato esperado.");
    return { data: response.parsed_output as z.infer<S>, offline: false, usage };
  }
}
