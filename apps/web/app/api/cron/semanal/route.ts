import { NextResponse } from "next/server";
import { runWeeklyClose } from "@/lib/jobs";
import { env } from "@/lib/env";

/**
 * Fechamento semanal (Vercel Cron, segunda-feira 9h de Brasília = 12h UTC).
 * Protegido por CRON_SECRET. Idempotente: pode rodar mais de uma vez.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (env.appEnv !== "local" && (!env.cronSecret || auth !== `Bearer ${env.cronSecret}`)) return new NextResponse("Não autorizado", { status: 401 });
  const out = await runWeeklyClose();
  return NextResponse.json({ ok: true, ...out, report: out.report.map((r) => ({ done: r.done })) });
}
