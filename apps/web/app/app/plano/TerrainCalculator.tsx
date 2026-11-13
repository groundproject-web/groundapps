"use client";
import { useState } from "react";
import { formatBRL, quote, type PricingRules, type SketchPlan } from "@ground/core";
import { requestPlanAction } from "@/app/actions/billing";

/** "Monte o seu terreno": escolhe o Sketch; a faixa do Marco Zero vem da base. Uma assinatura, uma fatura. */
export function TerrainCalculator({ rules, baseTier, initialSketch, initialMz }: { rules: PricingRules; baseTier: string | null; initialSketch: SketchPlan | null; initialMz: string | null }) {
  const [sk, setSk] = useState<SketchPlan | null>(initialSketch ?? "completo");
  const [mz, setMz] = useState<string | null>(initialMz ?? baseTier ?? "MZ2");
  const q = quote({ mzTierId: mz, sketchPlan: sk }, rules);
  const seg = (on: boolean) => `rounded-full px-3.5 py-2 text-[13.5px] border cursor-pointer ${on ? "bg-bone text-carvao border-bone font-semibold" : "border-[var(--rule-strong)] text-bone bg-transparent"}`;
  return (
    <form action={requestPlanAction} className="border border-[var(--rule-strong)] rounded-[14px] p-[22px] grid md:grid-cols-2 gap-[22px] items-center">
      <input type="hidden" name="mz" value={mz ?? ""} />
      <input type="hidden" name="sk" value={sk ?? ""} />
      <div className="flex flex-col gap-3.5">
        <span className="lbl">Monte o seu terreno</span>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Plano do Sketch">
          {([null, "inicio", "completo"] as const).map((p) => (
            <button key={String(p)} type="button" aria-pressed={sk === p} className={seg(sk === p)} onClick={() => setSk(p)}>
              {p === null ? "Sem Sketch" : `${p === "inicio" ? "Início" : "Completo"} · ${formatBRL(rules.sketchPlans[p])}`}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Faixa do Marco Zero">
          <button type="button" aria-pressed={mz === null} className={seg(mz === null)} onClick={() => setMz(null)}>
            Sem Marco Zero
          </button>
          {rules.mzTiers.map((t) => (
            <button key={t.id} type="button" aria-pressed={mz === t.id} className={seg(mz === t.id)} onClick={() => setMz(t.id)}>
              {t.label} · {formatBRL(t.priceCents)}
              {baseTier === t.id ? " (sua base)" : ""}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        {q.isCombo && <span className="line-through text-duna font-mono text-sm num">{formatBRL(q.fullCents)}</span>}
        <span className="font-display font-extrabold text-[clamp(40px,5vw,56px)] leading-none num" aria-live="polite">
          {formatBRL(q.totalCents, { decimals: q.totalCents % 100 !== 0 })}
        </span>
        <span className="lbl tracking-[0.1em]">por mês{q.isCombo ? ` · economia de ${formatBRL(q.savingsCents, { decimals: q.savingsCents % 100 !== 0 })} (−${q.totalDiscountPct}%)` : ""}</span>
        <span className="lbl tracking-[0.08em]">Valores em validação · hipótese</span>
        <button type="submit" className="btn btn-solid self-start mt-3" disabled={!mz && !sk}>
          Pedir este plano
        </button>
      </div>
    </form>
  );
}
