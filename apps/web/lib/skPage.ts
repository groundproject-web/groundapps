import "server-only";
import { cache } from "react";
import { sketchPlan } from "@ground/core";
import { requireModule } from "./orgs";
import { loadSketch, gapColumn } from "./sketch";
import { currentRules } from "./pricing";

export const getSkPage = cache(async () => {
  const ctx = await requireModule("sketch");
  const sk = await loadSketch(ctx);
  const plan = sketchPlan(ctx.entitlements) ?? "inicio";
  const rules = await currentRules(ctx.today);
  const data = sk.profile?.data ?? null;
  return { ctx, sk, data, plan, rules, gap: data ? gapColumn(data) : null };
});
