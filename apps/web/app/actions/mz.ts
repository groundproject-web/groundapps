"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { addDays, type Blocker, type CheckinAnswers, type ReplyClassification } from "@ground/core";
import { generateCarlaSeed } from "@ground/core/seeds";
import { aiClassifyReplies, aiProposeMapping } from "@ground/ai";
import { parseCsv, type ColumnMapping } from "@ground/core";
import { getOrgContext, requireModule } from "@/lib/orgs";
import { commitImport, decideDoubt, stageImport } from "@/lib/store";
import { classifyLocally, saveMessageOverride, submitCheckin, undoCheckin, mzSettings } from "@/lib/mz";
import { advanceWeek } from "@/lib/jobs";
import { getAi } from "@/lib/ai";
import { getDb } from "@/lib/db";
import { queueEmail, flushOutbox } from "@/lib/email";
import { stagingTools } from "@/lib/env";

const MAX_UPLOAD = 15 * 1024 * 1024;

async function stage(text: string, filename: string) {
  const ctx = await requireModule("marco_zero");
  const parsed = parseCsv(text);
  let mapping: ColumnMapping[] | undefined;
  try {
    const ai = await aiProposeMapping(getAi(), ctx.org.id, parsed.headers, parsed.rows.slice(0, 3));
    mapping = ai.data.columns.map((c) => ({ header: c.header, index: parsed.headers.indexOf(c.header), target: c.target })).filter((m) => m.index >= 0);
  } catch {
    mapping = undefined; // cai na heurística determinística
  }
  const r = await stageImport(ctx.session.userId, ctx.org.id, filename, text, mapping);
  if ("error" in r) redirect(`/app/marco-zero/conexao?erro=${encodeURIComponent(r.error)}`);
  redirect(`/app/marco-zero/organizacao?importacao=${r.id}`);
}

export async function uploadSheetAction(form: FormData) {
  const f = form.get("planilha");
  if (!(f instanceof File) || f.size === 0) redirect("/app/marco-zero/conexao?erro=" + encodeURIComponent("Escolha um arquivo CSV."));
  if (f.size > MAX_UPLOAD) redirect("/app/marco-zero/conexao?erro=" + encodeURIComponent("Arquivo grande demais para esta versão (15 MB). Fale com a Ground."));
  if (!/\.(csv|txt)$/i.test(f.name)) redirect("/app/marco-zero/conexao?erro=" + encodeURIComponent("Por enquanto, salve a planilha como CSV (no Excel: Salvar como → CSV)."));
  await stage(await f.text(), f.name);
}

export async function useDemoSheetAction() {
  await stage(generateCarlaSeed().csv, "folego-pedidos-exemplo.csv");
}

export async function decideDoubtAction(form: FormData) {
  const ctx = await requireModule("marco_zero");
  const d = String(form.get("decision"));
  await decideDoubt(ctx.session.userId, ctx.org.id, String(form.get("importId")), String(form.get("doubtId")), d === "juntar" || d === "separar" ? d : null);
  revalidatePath("/app/marco-zero/organizacao");
}

export async function commitImportAction(form: FormData) {
  const ctx = await requireModule("marco_zero");
  await commitImport(ctx.session.userId, ctx.org.id, String(form.get("importId")));
  // planilha nova: missões antigas continuam no histórico; a próxima é planejada a partir da base nova
  revalidatePath("/app", "layout");
  redirect("/app/marco-zero/leitura");
}

export async function saveMessageAction(missionId: string, text: string) {
  const ctx = await requireModule("marco_zero");
  await saveMessageOverride(ctx, missionId, text);
}

export async function checkinAction(form: FormData) {
  const ctx = await requireModule("marco_zero");
  const missionId = String(form.get("missionId"));
  const sendStatus = String(form.get("sendStatus")) as CheckinAnswers["sendStatus"];
  if (!["todas", "parte", "nenhuma"].includes(sendStatus)) throw new Error("Resposta inválida");
  const sentCount = Number(form.get("sentCount") ?? 0) || undefined;
  const blocker = (String(form.get("blocker") ?? "") || undefined) as Blocker | undefined;
  const repliesText = String(form.get("replies") ?? "")
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 500);
  const images = form.getAll("prints").filter((f): f is File => f instanceof File && f.size > 0 && f.size < 5 * 1024 * 1024 && /image\/(png|jpeg|webp)/.test(f.type)).slice(0, 8);

  let replies: ReplyClassification[] = classifyLocally(repliesText);
  const ai = getAi();
  if (ai.isOnline && (images.length || repliesText.length)) {
    try {
      const r = await aiClassifyReplies(ai, ctx.org.id, { texts: repliesText, images: await Promise.all(images.map(async (f) => ({ mediaType: f.type as "image/png", base64: Buffer.from(await f.arrayBuffer()).toString("base64") }))) });
      replies = r.data.categories.map((c) => ({ ...c, status: "hipotese" as const }));
    } catch {
      /* mantém a classificação local */
    }
  }
  // LGPD: a imagem não é guardada; fica só o resumo classificado, com prazo de exclusão
  if (images.length || repliesText.length) {
    const s = await mzSettings(ctx.org.id, ctx.today);
    const db = await getDb();
    await db.asUser(ctx.session.userId, (t) => t.query("insert into checkin_uploads(organization_id, mission_id, kind, storage_path, summary, delete_after) values ($1,$2,$3,null,$4,$5)", [ctx.org.id, missionId, images.length ? "imagem" : "texto", JSON.stringify({ categories: replies.map((r) => ({ category: r.category, count: r.count })), prints: images.length, aiRead: ai.isOnline }), addDays(ctx.today, s.retentionDays)]));
  }
  await submitCheckin(ctx, missionId, { sendStatus, sentCount, blocker, blockerNote: String(form.get("blockerNote") ?? "").slice(0, 500) || undefined, replies });
  revalidatePath("/app", "layout");
  redirect("/app/marco-zero/resultado");
}

export async function undoCheckinAction(form: FormData) {
  const ctx = await requireModule("marco_zero");
  await undoCheckin(ctx, String(form.get("missionId")));
  revalidatePath("/app", "layout");
  redirect("/app/marco-zero/check-in");
}

export async function advanceWeekAction(form: FormData) {
  if (!stagingTools) throw new Error("Só em staging.");
  const ctx = await getOrgContext();
  if (!ctx.org.is_demo) throw new Error("Só em lojas de demonstração.");
  await advanceWeek(ctx.org.id);
  revalidatePath("/app", "layout");
  redirect(String(form.get("back") ?? "/app/marco-zero/check-in"));
}

export async function contactGroundAction(form: FormData) {
  const ctx = await getOrgContext();
  const topic = String(form.get("topic") ?? "gargalo").slice(0, 80);
  const message = String(form.get("message") ?? "").slice(0, 2000);
  const module = String(form.get("module") ?? "marco_zero");
  const db = await getDb();
  await db.asUser(ctx.session.userId, (t) => t.query("insert into contact_requests(organization_id, module, topic, message) values ($1,$2,$3,$4)", [ctx.org.id, module, topic, message]));
  await db.service(async (t) => {
    await queueEmail(t, { orgId: ctx.org.id, toUser: null, kind: "converse_com_a_ground", subject: `[Ground] ${ctx.org.name} quer conversar: ${topic}`, body: `${ctx.org.name} (${module}) pediu uma conversa.\n\nAssunto: ${topic}\n\n${message}`, dedupeKey: `contato:${ctx.org.id}:${Date.now()}` });
    await flushOutbox(t);
  });
  redirect("/app/conversar?enviado=1");
}
