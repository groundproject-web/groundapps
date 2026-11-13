import { learningBadge, type Learning } from "@ground/core";

const swatch: Record<Learning["state"], string> = { fato: "swatch-fato", hipotese: "swatch-hipotese", ajustado: "swatch-gargalo", descartado: "swatch-sem_info", sem_info: "swatch-sem_info" };

export function LearningsList({ learnings }: { learnings: Learning[] }) {
  return (
    <ul className="list-none p-0 m-0 mt-3 border border-[var(--rule)] rounded-[14px] overflow-hidden">
      {learnings.map((l) => (
        <li key={l.key} className="grid grid-cols-[30px_minmax(0,1fr)] sm:grid-cols-[30px_minmax(0,1fr)_auto] gap-3.5 items-center px-4 py-3.5 border-t border-[var(--rule)] first:border-t-0 text-sm">
          <i className={`swatch ${swatch[l.state]} !w-[26px] !h-3.5`} aria-hidden />
          <span className={l.state === "descartado" ? "line-through text-duna" : ""}>{l.sentence}</span>
          <small className="font-mono text-[10.5px] tracking-[0.12em] uppercase text-duna whitespace-nowrap col-start-2 sm:col-start-auto">{learningBadge(l)}</small>
        </li>
      ))}
    </ul>
  );
}
