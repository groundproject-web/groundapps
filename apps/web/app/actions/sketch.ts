"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { weekStart, type SuggestionKey } from "@ground/core";
import { requireModule } from "@/lib/orgs";
import { addSketchMessage, addSource, markSuggestion, saveSketchCheckin, simulateSketchMonth, toggleChannel, toggleSketchMission, type SketchCheckin } from "@/lib/sketch";
import { stagingTools } from "@/lib/env";

export async function toggleChannelAction(key: string) {
  const ctx = await requireModule("sketch");
  await toggleChannel(ctx, key);
  revalidatePath("/app/sketch", "layout");
}

export async function toggleMissionAction(key: string) {
  const ctx = await requireModule("sketch");
  await toggleSketchMission(ctx, key);
  revalidatePath("/app/sketch", "layout");
}

/** Conversa de entrada: texto, transcrição de áudio e prints. Tudo vira fonte para a leitura. */
export async function sendSketchMessageAction(form: FormData) {
  const ctx = await requireModule("sketch");
  const text = String(form.get("text") ?? "").trim().slice(0, 2000);
  const audio = form.get("audio");
  const transcript = String(form.get("transcript") ?? "").trim().slice(0, 2000);
  const images = form.getAll("images").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 6);
  if (text) {
    await addSketchMessage(ctx, "lojista", "texto", { text });
    await addSource(ctx, `lojista-${Date.now()}`, "lojista", text, null);
  }
  if (audio instanceof File && audio.size > 0) {
    // transcrição automática depende de provedor (decisão pendente). Por ora: a transcrição digitada.
    await addSketchMessage(ctx, "lojista", "audio", { duration: "áudio", transcript: transcript || "(transcrição pendente)" });
    if (transcript) await addSource(ctx, `audio-${Date.now()}`, "lojista", transcript, null);
  }
  if (images.length) {
    await addSketchMessage(ctx, "lojista", "imagem", { images: images.map((f, i) => ({ title: `Print ${i + 1}`, caption: f.name.slice(0, 60) })) });
  }
  if (text || images.length || (audio instanceof File && audio.size > 0)) {
    await addSketchMessage(ctx, "app", "texto", { text: images.length ? "Recebi. Vou ler os prints e cruzar com o que você contou." : "Anotado. Isso entra na leitura da sua cliente." });
  }
  revalidatePath("/app/sketch/entrada");
}

export async function sketchCheckinAction(form: FormData) {
  const ctx = await requireModule("sketch");
  const did = String(form.get("did")) as SketchCheckin["did"];
  if (!["todas", "parte", "nenhuma"].includes(did)) throw new Error("Resposta inválida");
  await saveSketchCheckin(ctx, weekStart(ctx.today), { did, happened: String(form.get("happened") ?? "").slice(0, 2000), reportedNewSales: Number(form.get("sales") ?? 0) || undefined });
  revalidatePath("/app/sketch", "layout");
  redirect("/app/sketch/sinais");
}

export async function suggestionAction(form: FormData) {
  const ctx = await requireModule("sketch");
  const key = String(form.get("key")) as SuggestionKey;
  const action = String(form.get("action")) as "dismissed" | "accepted";
  await markSuggestion(ctx, key, action);
  revalidatePath("/app", "layout");
  if (action === "accepted") redirect(key === "sketch_para_mz" ? "/app/plano?modulo=marco_zero" : "/app/plano?modulo=sketch");
}

export async function simulateSketchMonthAction() {
  if (!stagingTools) throw new Error("Só em staging.");
  const ctx = await requireModule("sketch");
  if (!ctx.org.is_demo) throw new Error("Só em lojas de demonstração.");
  await simulateSketchMonth(ctx);
  revalidatePath("/app", "layout");
  redirect("/app/sketch/sinais");
}
