import { NextResponse } from "next/server";
import { toCsv } from "@ground/core";
import { getOrgContext } from "@/lib/orgs";
import { getDb } from "@/lib/db";
import { listMissions } from "@/lib/mz";
import { loadContacts } from "@/lib/store";

/** Lista da missão (nome e telefone) para o lojista mandar do próprio WhatsApp. Sem o grupo de comparação. */
export async function GET(req: Request) {
  const ctx = await getOrgContext();
  if (!ctx.modules.has("marco_zero")) return new NextResponse("Sem acesso", { status: 403 });
  const url = new URL(req.url);
  const id = url.searchParams.get("missao") ?? "";
  const part = Number(url.searchParams.get("parte") ?? 0);
  const db = await getDb();
  const missions = await db.asUser(ctx.session.userId, (t) => listMissions(t, ctx.org.id));
  const m = missions.find((x) => x.id === id);
  if (!m) return new NextResponse("Missão não encontrada", { status: 404 });
  const ids = m.plan.parts[part]?.targetIds ?? [];
  const rows = await loadContacts(ctx.session.userId, ctx.org.id, ids);
  const firstName = (n: string) => n.split(" ")[0];
  const csv = toCsv(
    ["nome", "primeiro_nome", "telefone", "whatsapp"],
    rows.map((r) => [r.name, firstName(r.name), r.phone ?? "", r.phone ? `https://wa.me/55${r.phone}` : ""]),
  );
  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="missao-${m.week_start}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
