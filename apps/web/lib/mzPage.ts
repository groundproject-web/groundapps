import "server-only";
import { cache } from "react";
import { requireModule } from "./orgs";
import { loadDataset } from "./store";
import { ensureMission, getMissionBundle, mzSettings, overview } from "./mz";

/** Dados compartilhados pelas telas do Marco Zero (uma leitura por requisição). */
export const getMzPage = cache(async () => {
  const ctx = await requireModule("marco_zero");
  const ds = await loadDataset(ctx.session.userId, ctx.org.id);
  const hasData = ds.orders.length > 0;
  const ov = hasData ? overview(ds, ctx.today) : null;
  if (hasData) await ensureMission(ctx, ds);
  const bundle = await getMissionBundle(ctx);
  const settings = await mzSettings(ctx.org.id, ctx.today);
  const current = bundle.missions[bundle.missions.length - 1] ?? null;
  const previous = bundle.missions.length > 1 ? bundle.missions[bundle.missions.length - 2] : null;
  // a missão "em foco" no check-in/resultado: a aberta, ou a última fechada
  const lastClosed = [...bundle.missions].reverse().find((m) => m.status === "fechada") ?? null;
  return { ctx, ds, hasData, ov, bundle, settings, current, previous, lastClosed };
});
