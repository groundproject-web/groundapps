import { STATUSES, type Status } from "@ground/core";

const TEXT: Record<Status, string> = {
  fato: "Fato: confirmado pelos dados",
  hipotese: "Hipótese: ainda pode mudar",
  gargalo: "Gargalo: onde o crescimento trava",
  sem_info: "Sem informação suficiente",
};

export function StatusLegend({ only }: { only?: Status[] }) {
  return (
    <ul className="flex flex-wrap gap-x-[18px] gap-y-2 m-0 p-0 list-none text-[12.5px] text-duna" aria-label="Legenda do traço">
      {(only ?? STATUSES).map((s) => (
        <li key={s} className="flex gap-2 items-center">
          <i className={`swatch swatch-${s}`} aria-hidden />
          {TEXT[s]}
        </li>
      ))}
    </ul>
  );
}
