import { cx } from "./basics";

const STEPS = ["Missão", "Check-in", "Resultado", "Ajuste"] as const;

/** O ciclo da semana: Missão → Check-in → Resultado → Ajuste ↺ */
export function LoopIndicator({ current, className }: { current: 0 | 1 | 2 | 3; className?: string }) {
  return (
    <ol className={cx("flex items-center gap-2.5 flex-wrap list-none p-0 m-0", className)} aria-label="Ciclo da semana">
      {STEPS.map((s, i) => (
        <li key={s} className="flex items-center gap-2.5">
          <span
            aria-current={i === current ? "step" : undefined}
            className={cx(
              "rounded-full px-3.5 py-1.5 font-mono text-[11px] tracking-[0.14em] uppercase",
              i < current && "border-[1.4px] border-solid border-duna text-duna",
              i === current && "border-[1.6px] border-bone bg-bone text-carvao",
              i > current && "border-[1.4px] border-dashed border-[var(--rule-strong)] text-duna",
            )}
          >
            {i < current && <span className="sr-only">Feito: </span>}
            {s}
          </span>
          {i < 3 && (
            <span className="font-mono text-sombra" aria-hidden>
              →
            </span>
          )}
        </li>
      ))}
      <li className="font-mono text-sombra" aria-hidden>
        ↺
      </li>
    </ol>
  );
}
