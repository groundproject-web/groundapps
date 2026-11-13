"use client";
import { useEffect, useState } from "react";

/** Barra de progresso: pedidos lidos, clientes únicas e cadastros repetidos encontrados. */
export function ImportProgress({ orders, customers, duplicates, source }: { orders: number; customers: number; duplicates: number; source: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return setN(orders);
    const id = setInterval(() => setN((x) => Math.min(orders, x + Math.ceil(orders / 28))), 90);
    return () => clearInterval(id);
  }, [orders]);
  const p = orders ? Math.round((n / orders) * 100) : 100;
  const fmt = (v: number) => v.toLocaleString("pt-BR");
  return (
    <div className="border border-[var(--rule)] rounded-xl p-5 bg-deep flex flex-col gap-3">
      <div className="flex justify-between gap-3 flex-wrap">
        <span aria-live="polite">{n < orders ? `Lendo ${fmt(n)} de ${fmt(orders)} pedidos…` : `${fmt(orders)} pedidos lidos · ${fmt(customers)} clientes únicas`}</span>
        <span className="lbl">{p}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-[rgba(242,239,231,.08)] overflow-hidden" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso da leitura">
        <i className="block h-full transition-[width] duration-200" style={{ width: `${p}%`, background: "repeating-linear-gradient(-48deg,var(--color-bone) 0 2px,rgba(242,239,231,.55) 2px 6px)" }} />
      </div>
      <div className="flex justify-between gap-3 flex-wrap">
        <span className="lbl">Cadastros repetidos encontrados: {fmt(Math.round((duplicates * n) / Math.max(1, orders)))}</span>
        <span className="lbl">Fonte: {source}</span>
      </div>
    </div>
  );
}
