import { cx } from "./basics";

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/**
 * Receita por mês, empilhada: alugada (1ª compra) tracejada/hachurada em cima,
 * construída (quem voltou) sólida embaixo. Valores em R$ mil.
 */
export function RentedBuiltChart({ data, partialLast }: { data: { month: string; rentedCents: number; builtCents: number }[]; partialLast?: boolean }) {
  const W = 860;
  const H = 300;
  const x0 = 56;
  const y0 = 24;
  const ch = 220;
  const bw = 74;
  const totals = data.map((d) => (d.rentedCents + d.builtCents) / 100_000);
  const rawMax = Math.max(10, ...totals);
  const step = rawMax > 60 ? 20 : rawMax > 30 ? 10 : 5;
  const max = Math.ceil((rawMax * 1.1) / step) * step;
  const gap = data.length > 1 ? (W - x0 - 24 - data.length * bw) / (data.length - 1) : 0;
  const Y = (v: number) => y0 + ch - (v / max) * ch;
  const ticks = Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => i * step);
  const desc = data.map((d, i) => `${MONTHS[Number(d.month.slice(5)) - 1]}: R$ ${Math.round(totals[i])} mil, ${totals[i] ? Math.round((d.rentedCents / 100_000 / totals[i]) * 100) : 0}% de cliente nova`).join("; ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Receita mensal. ${desc}`} className="w-full h-auto block">
      <defs>
        <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-48)">
          <line x1="0" y1="0" x2="0" y2="7" stroke="rgba(242,239,231,.55)" strokeWidth="1.4" />
        </pattern>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x0} x2={W - 16} y1={Y(t)} y2={Y(t)} stroke="rgba(242,239,231,.1)" />
          <text x={x0 - 10} y={Y(t) + 4} textAnchor="end" fill="#B8B1A2" fontFamily="IBM Plex Mono,monospace" fontSize="11">
            {t}
          </text>
        </g>
      ))}
      {data.map((d, i) => {
        const x = x0 + i * (bw + gap);
        const own = d.builtCents / 100_000;
        const v = totals[i];
        return (
          <g key={d.month}>
            {own > 0 && <rect x={x} y={Y(own)} width={bw} height={ch - (Y(own) - y0)} fill="#F2EFE7" rx="2" />}
            {v - own > 0 && <rect x={x + 0.8} y={Y(v) + 0.8} width={bw - 1.6} height={Math.max(0, Y(own) - Y(v) - 2.6)} fill="url(#hatch)" stroke="#F2EFE7" strokeWidth="1.4" strokeDasharray="5 4" rx="2" />}
            <text x={x + bw / 2} y={Y(v) - 8} textAnchor="middle" fill="#F2EFE7" fontFamily="Archivo,Arial" fontWeight="600" fontSize="13">
              {Math.round(v)}
            </text>
            <text x={x + bw / 2} y={y0 + ch + 20} textAnchor="middle" fill="#B8B1A2" fontFamily="IBM Plex Mono,monospace" fontSize="11" letterSpacing="1.5">
              {MONTHS[Number(d.month.slice(5)) - 1].toUpperCase()}
              {partialLast && i === data.length - 1 ? "*" : ""}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Barra horizontal "com × sem a mensagem". */
export function VsRow({ label, rate, kind }: { label: string; rate: number; kind: "own" | "base" }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_56px] md:grid-cols-[minmax(0,190px)_minmax(0,1fr)_64px] gap-3.5 items-center text-sm">
      <span>{label}</span>
      <span className="h-[22px] rounded bg-[rgba(242,239,231,.06)] overflow-hidden col-span-2 row-start-2 md:col-span-1 md:row-start-auto">
        <i
          className={cx("block h-full", kind === "own" ? "bg-bone" : "border-[1.4px] border-dashed border-duna")}
          style={{ width: `${Math.min(100, Math.round(rate * 400))}%`, background: kind === "base" ? "repeating-linear-gradient(-48deg,rgba(242,239,231,.35) 0 1.2px,transparent 1.2px 5px)" : undefined }}
        />
      </span>
      <b className="font-display text-xl text-right num">{Math.round(rate * 100)}%</b>
    </div>
  );
}
