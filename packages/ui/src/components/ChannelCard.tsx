import type { Status } from "@ground/core";
import { cx } from "./basics";

export function PriorityMeter({ value }: { value: number }) {
  return (
    <span className="flex gap-1" role="img" aria-label={`Prioridade ${value} de 4`}>
      {[1, 2, 3, 4].map((i) => (
        <i key={i} className={cx("w-[18px] h-1.5 rounded-sm", i <= value ? "bg-bone" : "bg-[rgba(242,239,231,.15)]")} />
      ))}
    </span>
  );
}

/** Canal do mapa "Onde ela está": descrição concreta, prioridade 1–4 e No plano / Fora do plano. */
export function ChannelCard({ title, detail, priority, inPlan, status = "hipotese", onToggle, note }: { title: string; detail: string; priority: number; inPlan: boolean; status?: Status; onToggle?: () => void; note?: string }) {
  return (
    <button type="button" aria-pressed={inPlan} onClick={onToggle} className={cx("text-left rounded-[14px] p-5 flex flex-col gap-3 min-w-0 bg-deep cursor-pointer text-bone", `st-${status}`, !inPlan && "opacity-55")}>
      <h3 className="m-0 font-display font-semibold text-[19px]">{title}</h3>
      <p className="m-0 text-[14.5px] text-duna">{detail}</p>
      {note && <p className="m-0 text-[13px] text-bone">{note}</p>}
      <span className="flex justify-between items-center gap-2.5">
        <PriorityMeter value={priority} />
        <span className="font-mono text-[10.5px] tracking-[0.14em] uppercase">{inPlan ? "No plano" : "Fora do plano"}</span>
      </span>
    </button>
  );
}
