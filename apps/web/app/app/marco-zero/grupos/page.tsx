import { formatBRL, formatInt } from "@ground/core";
import { Card, PageHeader, StatusLegend } from "@ground/ui";
import { getMzPage } from "@/lib/mzPage";
import { NextLink, NoData } from "@/components/NoData";

export const metadata = { title: "Grupos de clientes" };

export default async function Grupos() {
  const { ov, ctx, ds } = await getMzPage();
  if (!ov) return <NoData />;
  const segs = ov.segments.filter((s) => !s.proposta || s.count > 0);
  // Mini-grupo "Novas do Sketch": só com os dois módulos
  const sketchNew = ctx.integrated ? new Set(ds.orders.filter((o) => o.sourceCode?.startsWith("SK-")).map((o) => o.customerId)) : null;
  return (
    <>
      <PageHeader label="Grupos de clientes" title="Quem é quem na sua base." sub="Cada grupo pede uma ação diferente. O traço mostra o estado de cada um, do mesmo jeito que a Ground desenha um diagnóstico." />
      <div className="grid md:grid-cols-2 gap-3.5">
        {segs.map((s) => (
          <Card key={s.key} status={s.status} title={s.name}>
            <div className="font-display font-extrabold text-[40px] leading-none num">
              {formatInt(s.count)}
              <small className="font-body font-medium text-sm text-duna ml-1.5">clientes</small>
            </div>
            <p className="m-0 text-sm text-duna">{s.description}</p>
            <span className="font-mono text-[13px]">
              {formatBRL(s.totalCents)} {s.key === "sumidos" ? "já pagos · potencial de volta" : "em compras acumuladas"}
            </span>
            {s.proposta && <span className="lbl">Grupo proposto · aguardando os sócios</span>}
          </Card>
        ))}
        {sketchNew && sketchNew.size > 0 && (
          <Card status="hipotese" title="Novas do Sketch">
            <div className="font-display font-extrabold text-[40px] leading-none num">
              {sketchNew.size}
              <small className="font-body font-medium text-sm text-duna ml-1.5">clientes</small>
            </div>
            <p className="m-0 text-sm text-duna">Chegaram pelos canais do Sketch. O Marco Zero acompanha a 2ª compra delas e chama quando o ciclo do produto chegar.</p>
          </Card>
        )}
      </div>
      {ov.cycles.length > 0 && (
        <section className="mt-7" aria-labelledby="ciclos">
          <h2 id="ciclos" className="lbl">
            Ciclo de recompra por produto
          </h2>
          <ul className="list-none p-0 mt-3 flex flex-col border border-[var(--rule)] rounded-[14px] overflow-hidden">
            {ov.cycles.slice(0, 5).map((c) => (
              <li key={c.product} className="flex justify-between gap-4 px-4 py-3.5 border-t border-[var(--rule)] first:border-t-0 text-sm flex-wrap">
                <span>{c.product}</span>
                <span className="lbl">
                  Fato · {c.p25Days} a {c.p75Days} dias · {c.intervals} recompras
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="mt-[18px]">
        <StatusLegend />
      </div>
      <NextLink href="/app/marco-zero/missao">Ver a missão da semana →</NextLink>
    </>
  );
}
