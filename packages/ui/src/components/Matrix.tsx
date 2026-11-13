import type { TerrainMatrix } from "@ground/core";
import { cx } from "./basics";

/**
 * O terreno ao redor: marcas nas linhas, promessas nas colunas.
 * A coluna do espaço vazio aparece hachurada (gargalo/espaço vazio).
 * Cada ponto guarda a fonte (URL, data, trecho) no título acessível.
 */
export function Matrix({ matrix, gapColumn }: { matrix: TerrainMatrix; gapColumn: number | null }) {
  const gapCls = "border-x-[1.6px] border-dashed border-bone";
  return (
    <div className="overflow-x-auto border border-[var(--rule)] rounded-[14px] bg-deep">
      <table className="border-collapse w-full min-w-[640px] text-sm">
        <caption className="sr-only">Matriz de promessas. {gapColumn !== null ? `Espaço vazio: ${matrix.columns[gapColumn]}.` : ""}</caption>
        <thead>
          <tr>
            <th scope="col" className="lbl font-medium text-left px-2.5 py-3.5 align-bottom">
              Marca
            </th>
            {matrix.columns.map((c, i) => (
              <th key={c} scope="col" className={cx("lbl font-medium text-center px-2.5 py-3.5 align-bottom", i === gapColumn && cx(gapCls, "hatch-bg"))}>
                {c}
                {i === gapColumn && <span className="block mt-1 normal-case tracking-normal text-bone">espaço vazio</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map((r) => (
            <tr key={r.name} className={cx(r.isYou && "bg-[rgba(242,239,231,.06)]")}>
              <th scope="row" className="text-left font-semibold border-t border-[var(--rule)] px-2.5 py-3">
                {r.name}
                {!r.confirmed && <span className="lbl ml-2">sugerido</span>}
              </th>
              {r.cells.map((cell, i) => {
                const label = cell.promises === null ? "Sem informação" : cell.promises ? "Promete" : "Não promete";
                const src = cell.evidence ? ` · fonte: ${cell.evidence.url ?? cell.evidence.ref} (${cell.evidence.collectedAt.slice(0, 10)})` : " · sem fonte";
                return (
                  <td key={i} className={cx("border-t border-[var(--rule)] px-2.5 py-3 text-center", i === gapColumn && cx(gapCls, "hatch-bg"))}>
                    <span
                      title={`${label}${src}${cell.evidence?.excerpt ? ` — “${cell.evidence.excerpt}”` : ""}`}
                      aria-label={`${r.name}, ${matrix.columns[i]}: ${label}${src}`}
                      role="img"
                      className={cx("inline-block w-4 h-4 rounded-full", cell.promises ? "bg-bone" : "bg-transparent border border-dotted border-sombra")}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
