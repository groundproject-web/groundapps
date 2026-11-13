"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { GroundMark } from "@ground/ui";

export interface RailStep {
  href: string;
  label: string;
  /** separador antes deste passo (ex.: "Uma semana depois") */
  sep?: string;
}

/** Trilho lateral com as telas do módulo, como uma rota de marcos (protótipos). No celular vira faixa horizontal. */
export function Rail({ product, store, steps, foot, linked }: { product: string; store: { initial: string; name: string; what: string }; steps: RailStep[]; foot?: ReactNode; linked?: ReactNode }) {
  const path = usePathname();
  return (
    <aside className="min-w-0 bg-vazio border-b md:border-b-0 md:border-r border-[var(--rule)] px-4 py-4 md:px-[18px] md:pt-7 md:pb-6 flex flex-col gap-3.5 md:gap-[22px] md:sticky md:top-0 md:h-screen md:overflow-y-auto">
      <div className="flex md:flex-col items-center md:items-start justify-between gap-3 px-1.5">
        <GroundMark width={96} />
        <div className="font-display font-extrabold text-[21px] leading-none uppercase tracking-[0.01em]">
          <small className="block font-mono font-normal text-[10.5px] tracking-[0.22em] text-duna mb-1.5">Ground</small>
          {product}
        </div>
      </div>
      <div className="hidden md:flex gap-2.5 items-center p-3 border border-[var(--rule)] rounded-[10px]">
        <div className="w-[34px] h-[34px] rounded-full bg-panel grid place-items-center font-display font-semibold text-sm flex-none border border-[var(--rule-strong)]" aria-hidden>
          {store.initial}
        </div>
        <div className="min-w-0">
          <b className="block text-[13.5px] font-semibold truncate">{store.name}</b>
          <span className="text-xs text-duna">{store.what}</span>
        </div>
      </div>
      {linked && <div className="hidden md:block px-1.5">{linked}</div>}
      <nav aria-label={`Telas do ${product}`}>
        <ol className="list-none m-0 p-0 flex md:flex-col gap-1 md:gap-0.5 overflow-x-auto">
          {steps.map((s, i) => {
            const current = path === s.href;
            return (
              <li key={s.href} className="flex-none md:flex-auto">
                {s.sep && <span className="hidden md:block font-mono text-[10px] tracking-[0.2em] uppercase text-sombra px-2 pt-3.5 pb-1 border-t border-[var(--rule)] mt-2">{s.sep}</span>}
                <Link
                  href={s.href}
                  aria-current={current ? "page" : undefined}
                  className={`grid grid-cols-[auto_auto] md:grid-cols-[28px_minmax(0,1fr)] gap-2 items-center rounded-lg px-2 py-2 md:py-[9px] no-underline whitespace-nowrap md:whitespace-normal ${current ? "bg-[rgba(242,239,231,.1)] text-bone" : "text-duna hover:bg-[var(--hover)]"}`}
                >
                  <span className="font-mono text-[11px]">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-sm leading-tight">{s.label}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>
      {foot && <div className="hidden md:flex mt-auto flex-col gap-2 px-1.5">{foot}</div>}
    </aside>
  );
}
