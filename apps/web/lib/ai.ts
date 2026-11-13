import "server-only";
import { AiClient } from "@ground/ai";
import { getDb } from "./db";
import { env } from "./env";

/** IA com registro de custo por chamada e por organização (tabela ai_usage). */
export function getAi(): AiClient {
  return new AiClient(
    async (u) => {
      const db = await getDb();
      await db.service((t) =>
        t.query("insert into ai_usage(organization_id, feature, prompt_version, model, input_tokens, output_tokens, cost_usd_micros, offline) values ($1,$2,$3,$4,$5,$6,$7,$8)", [u.orgId, u.feature, u.promptVersion, u.model, u.inputTokens, u.outputTokens, u.costUsdMicros, u.offline]),
      );
    },
    { apiKey: env.anthropicKey },
  );
}
