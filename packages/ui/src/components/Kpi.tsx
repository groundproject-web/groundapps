import type { ReactNode } from "react";
import type { Status } from "@ground/core";
import { cx } from "./basics";

const TOP: Record<Status, string> = {
  fato: "border-t-2 border-solid border-bone",
  hipotese: "border-t-2 border-dashed border-bone",
  gargalo: "border-t-2 border-solid border-bone hatch-bg",
  sem_info: "border-t border-dotted border-sombra",
};

export function Kpi({ label, value, detail, status = "fato" }: { label: ReactNode; value: ReactNode; detail?: ReactNode; status?: Status }) {
  return (
    <div className={cx("pt-3.5 px-1 pb-1 flex flex-col gap-1.5 min-w-0", TOP[status])} data-status={status}>
      <span className="lbl">{label}</span>
      <span className={cx("font-display font-extrabold leading-none num text-[clamp(28px,3vw,38px)]", status === "sem_info" && "text-sombra")}>{value}</span>
      {detail && <span className="text-[13px] text-duna">{detail}</span>}
    </div>
  );
}

export function KpiRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{children}</div>;
}
