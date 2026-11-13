import "server-only";
import type { Queryable } from "./db";
import { env } from "./env";

/**
 * E-mail para o LOJISTA (lembrete do check-in, resumo, aviso à Ground).
 * Nunca para as clientes do lojista: os apps não disparam mensagens.
 * Fila idempotente (email_outbox.dedupe_key). Sem RESEND_API_KEY, só registra.
 */
export async function queueEmail(t: Queryable, p: { orgId: string | null; toUser: string | null; kind: string; subject: string; body: string; dedupeKey: string }): Promise<boolean> {
  const r = await t.query("insert into email_outbox(organization_id, to_user, kind, subject, body, dedupe_key) values ($1,$2,$3,$4,$5,$6) on conflict (dedupe_key) do nothing returning id", [p.orgId, p.toUser, p.kind, p.subject, p.body, p.dedupeKey]);
  return r.length > 0;
}

/** Envia o que está na fila (rodado pelo cron). */
export async function flushOutbox(t: Queryable): Promise<number> {
  const pending = await t.query<{ id: string; subject: string; body: string; email: string | null }>(
    "select o.id, o.subject, o.body, coalesce(u.email, $1) as email from email_outbox o left join auth.users u on u.id = o.to_user where o.sent_at is null order by o.created_at limit 50",
    [env.groundNotifyEmail],
  );
  let sent = 0;
  for (const m of pending) {
    if (!m.email) continue;
    if (env.resendKey) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: env.emailFrom, to: [m.email], subject: m.subject, text: m.body }),
      });
      if (!res.ok) continue;
    } else {
      console.info(`[e-mail simulado] ${m.subject}`);
    }
    await t.query("update email_outbox set sent_at = now() where id = $1", [m.id]);
    sent++;
  }
  return sent;
}
