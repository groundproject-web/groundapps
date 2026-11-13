"use client";
import { useState } from "react";
import { formatBRL, simulateReturn } from "@ground/core";
import { DotsGrid } from "@ground/ui";

export function Simulator({ gone, ticketCents }: { gone: number; ticketCents: number }) {
  const [pct, setPct] = useState(10);
  const s = simulateReturn({ goneCount: gone, avgFirstTicketCents: ticketCents }, pct);
  return (
    <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-7 items-start">
      <div>
        <DotsGrid total={gone} highlighted={s.customersBack} />
        <p className="lbl tracking-[0.12em] mt-2.5">Cada quadrado é uma cliente · em destaque, as que voltariam</p>
      </div>
      <div className="st-hipotese rounded-[14px] p-[22px] flex flex-col gap-4 bg-deep">
        <span className="lbl">Se {pct}% voltarem</span>
        <div className="font-display font-extrabold text-[clamp(40px,5vw,64px)] leading-none tracking-[-0.01em] num" aria-live="polite">
          {formatBRL(s.revenueCents)}
        </div>
        <p className="m-0 text-duna">a mais em receita, sem precisar de uma cliente nova.</p>
        <label className="lbl tracking-[0.12em]" htmlFor="pct">
          Arraste para simular o retorno
        </label>
        <input id="pct" type="range" min={1} max={40} step={1} value={pct} onChange={(e) => setPct(Number(e.target.value))} className="w-full h-7 accent-bone" aria-valuetext={`${pct}%`} />
        <div className="flex justify-between font-mono text-[11px] text-duna" aria-hidden>
          <span>1%</span>
          <span>10%</span>
          <span>20%</span>
          <span>30%</span>
          <span>40%</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-2.5">
          <div className="border-t border-[var(--rule)] pt-2">
            <span className="lbl">Clientes que voltam</span>
            <b className="block font-display text-xl num">{s.customersBack.toLocaleString("pt-BR")}</b>
          </div>
          <div className="border-t border-[var(--rule)] pt-2">
            <span className="lbl">Por mês, em 6 meses</span>
            <b className="block font-display text-xl num">{formatBRL(s.perMonthCents)}</b>
          </div>
        </div>
        <span className="lbl tracking-[0.1em]">Hipótese · simulação, não promessa</span>
      </div>
    </div>
  );
}
