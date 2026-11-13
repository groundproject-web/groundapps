import "server-only";

/**
 * Configuração por ambiente. Sem nenhuma variável, o app roda 100% local:
 * PGlite em .data/, login local, IA offline, e-mail só no log. É o modo demo.
 */
export const env = {
  appEnv: (process.env.APP_ENV ?? "local") as "local" | "staging" | "production",
  databaseUrl: process.env.DATABASE_URL ?? null,
  supabaseUrl: process.env.SUPABASE_URL ?? null,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? null,
  authSecret: process.env.AUTH_SECRET ?? "dev-only-secret-troque-em-staging-0123456789",
  encryptionKey: process.env.APP_ENCRYPTION_KEY ?? null,
  anthropicKey: process.env.ANTHROPIC_API_KEY ?? null,
  resendKey: process.env.RESEND_API_KEY ?? null,
  emailFrom: process.env.EMAIL_FROM ?? "Ground <nao-responda@example.com>",
  cronSecret: process.env.CRON_SECRET ?? null,
  groundNotifyEmail: process.env.GROUND_NOTIFY_EMAIL ?? null,
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
};

/** Ferramentas de demonstração (botão "avançar uma semana", login de demo): nunca em produção. */
export const stagingTools = env.appEnv !== "production";

export function assertProductionConfig() {
  if (env.appEnv === "production") {
    for (const [k, v] of Object.entries({ DATABASE_URL: env.databaseUrl, AUTH_SECRET: process.env.AUTH_SECRET, APP_ENCRYPTION_KEY: env.encryptionKey, CRON_SECRET: env.cronSecret })) {
      if (!v) throw new Error(`Variável obrigatória em produção: ${k}`);
    }
  }
}
