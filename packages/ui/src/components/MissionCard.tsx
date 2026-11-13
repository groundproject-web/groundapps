import type { ReactNode } from "react";
import { cx } from "./basics";

/** Missão principal do Marco Zero: o "por que", a estimativa (sempre hipótese) e ações. */
export function MissionCard({ why, estimate, children }: { why: string[]; estimate?: { orders: number; revenue: string; rateLabel: string }; children?: ReactNode }) {
  return (
    <div className="st-fato rounded-[14px] p-[22px] flex flex-col gap-3.5 bg-deep">
      <span className="lbl">Por que esta missão</span>
      <ul className="m-0 pl-[18px] flex flex-col gap-1.5 text-sm text-duna">
        {why.map((w, i) => (
          <li key={i}>{w}</li>
        ))}
      </ul>
      {estimate && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="border-t border-[var(--rule)] pt-2">
              <span className="lbl">{estimate.rateLabel}</span>
              <b className="block font-display text-[22px] num">{estimate.orders} pedidos</b>
            </div>
            <div className="border-t border-[var(--rule)] pt-2">
              <span className="lbl">Receita estimada</span>
              <b className="block font-display text-[22px] num">{estimate.revenue}</b>
            </div>
          </div>
          <span className="lbl tracking-[0.12em] inline-flex items-center gap-2">
            <i className="swatch swatch-hipotese" aria-hidden />
            Estimativa · hipótese a confirmar na próxima semana
          </span>
        </>
      )}
      {children}
    </div>
  );
}

/** Missão do Sketch: marcável como feita. */
export function CheckMission({ title, detail, category, done, onToggle, children }: { title: string; detail: string; category: string; done: boolean; onToggle?: () => void; children?: ReactNode }) {
  return (
    <div className="border border-[var(--rule)] rounded-xl bg-deep">
      <button type="button" aria-pressed={done} onClick={onToggle} className="grid grid-cols-[28px_minmax(0,1fr)] sm:grid-cols-[28px_minmax(0,1fr)_auto] gap-3.5 items-start p-4 w-full text-left cursor-pointer bg-transparent border-0 text-bone">
        <span className={cx("w-[22px] h-[22px] rounded-[5px] grid place-items-center border-[1.5px]", done ? "bg-bone border-bone" : "border-duna")} aria-hidden>
          {done && <span className="w-2.5 h-[5px] border-l-2 border-b-2 border-carvao -rotate-45 -translate-y-px" />}
        </span>
        <span>
          <b className="block text-[15px] font-semibold">{title}</b>
          <span className="text-[13.5px] text-duna">{detail}</span>
        </span>
        <span className="lbl hidden sm:inline">{category}</span>
      </button>
      {children && <div className="px-4 pb-4 pl-[58px]">{children}</div>}
    </div>
  );
}
