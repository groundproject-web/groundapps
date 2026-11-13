import Link from "next/link";
import { formatBRL, formatInt } from "@ground/core";
import { Card, PageHeader, Say } from "@ground/ui";
import { getMzPage } from "@/lib/mzPage";
import { NoData } from "@/components/NoData";
import { Simulator } from "./Simulator";

export const metadata = { title: "Dinheiro parado" };

export default async function DinheiroParado() {
  const { ov, ctx, current } = await getMzPage();
  if (!ov) return <NoData />;
  const { idle, baseline } = ov;
  const totalLast6 = baseline.monthly.reduce((s, m) => s + m.totalCents, 0);
  const rented6 = baseline.monthly.reduce((s, m) => s + m.rentedCents, 0);
  return (
    <>
      <PageHeader
        label="Dinheiro parado"
        title={
          <>
            <span className="num">{formatInt(idle.goneCount)}</span> clientes compraram uma vez e sumiram.
          </>
        }
        sub={`Cada uma já conhece a ${ctx.org.name.split(" ")[0]}, já confiou e já pagou. Ticket médio da primeira compra: ${formatBRL(idle.avgFirstTicketCents)}.`}
      />
      <Simulator gone={idle.goneCount} ticketCents={idle.avgFirstTicketCents} />
      <section className="mt-9" aria-labelledby="choque">
        <h2 id="choque" className="lbl">
          O choque do mês 1
        </h2>
        <div className="grid md:grid-cols-3 gap-3.5 mt-3">
          <Card status="gargalo" title="A dependência">
            <b className="font-display font-extrabold text-4xl num">{totalLast6 ? Math.round((rented6 / totalLast6) * 100) : 0}%</b>
            <p className="m-0 text-sm text-duna">da receita dos últimos 6 meses é alugada: veio de cliente nova.</p>
          </Card>
          <Card status="fato" title="O dinheiro parado">
            <b className="font-display font-extrabold text-4xl num">{formatBRL(idle.goneCount * idle.avgFirstTicketCents)}</b>
            <p className="m-0 text-sm text-duna">já pagos por clientes que nunca voltaram.</p>
          </Card>
          <Card status="hipotese" title="A primeira missão">
            <p className="m-0 text-sm">{current?.plan.headline ?? "Assim que a base estiver lida."}</p>
            <Link href="/app/marco-zero/missao" className="btn self-start">
              Ver a missão
            </Link>
          </Card>
        </div>
      </section>
      <div className="mt-10 pt-5 border-t border-[var(--rule)] flex flex-wrap gap-y-3 gap-x-6 justify-between items-center">
        <Say>Em vez de investir mais em anúncio, recupere quem já te conhece. É mais barato e mais rápido.</Say>
        <Link href="/app/marco-zero/grupos" className="btn btn-solid">
          Ver os grupos →
        </Link>
      </div>
    </>
  );
}
