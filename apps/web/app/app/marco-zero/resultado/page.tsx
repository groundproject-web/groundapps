import Link from "next/link";
import { BLOCKER_LABEL, formatBRL, segLabel } from "@ground/core";
import { Card, Kpi, KpiRow, Label, LoopIndicator, PageHeader, VsRow } from "@ground/ui";
import { getMzPage } from "@/lib/mzPage";
import { NoData, NextLink } from "@/components/NoData";

export const metadata = { title: "Resultado" };
const pct = (x: number) => Math.round(x * 100);
const fmtWeek = (d: string) => {
  const end = new Date(Date.parse(d + "T00:00:00Z") + 6 * 864e5).toISOString().slice(0, 10);
  const f = (x: string) => x.split("-").reverse().slice(0, 2).join("/");
  return `${f(d)} a ${f(end)}`;
};

export default async function Resultado() {
  const { lastClosed, bundle, hasData } = await getMzPage();
  if (!hasData) return <NoData />;
  if (!lastClosed) {
    return (
      <>
        <PageHeader label="Resultado" title="Primeiro, o check-in." sub="Sem saber se a mensagem saiu, o Marco Zero não consegue separar o efeito da missão do acaso." />
        <Link href="/app/marco-zero/check-in" className="btn btn-solid">
          ← Fazer o check-in
        </Link>
      </>
    );
  }
  const r = bundle.results.get(lastClosed.id)!;
  const ci = bundle.checkins.get(lastClosed.id)!;
  const ex = r.extras;
  if (r.sendStatus === "nenhuma") {
    const alone = r.cameBackAlone!;
    return (
      <>
        <PageHeader label={`Resultado · semana de ${fmtWeek(lastClosed.week_start)}`} title="Sem envio, sem resultado. E isso também ensina." sub="Mesmo sem a mensagem, a loja mostra quantas dessas clientes voltaram sozinhas. Esse número vira a régua para medir as próximas missões." />
        <LoopIndicator current={2} className="mb-6" />
        <div className="grid md:grid-cols-2 gap-4">
          <Card status="fato" title="Voltaram sozinhas">
            <div className="font-display font-extrabold text-[clamp(40px,5vw,64px)] leading-none num">{alone.count}</div>
            <p className="m-0 text-sm text-duna">
              das {alone.of} clientes compraram de novo sem nenhum contato: {pct(alone.rate)}%. É o que acontece quando ninguém chama.
            </p>
          </Card>
          <Card status="sem_info" title="Efeito da mensagem">
            <div className="font-display font-extrabold text-[clamp(40px,5vw,64px)] leading-none text-sombra">?</div>
            <p className="m-0 text-sm text-duna">Fica para a próxima semana.{ci.blocker ? ` Motivo registrado: ${BLOCKER_LABEL[ci.blocker].toLowerCase()}.` : ""}</p>
          </Card>
        </div>
        {ex.simulated && <p className="lbl mt-4">Demonstração · os pedidos da semana foram simulados</p>}
        <NextLink href="/app/marco-zero/ajuste">Ver o ajuste →</NextLink>
      </>
    );
  }
  const est = r.estimate?.orders ?? 0;
  const worst = [...r.byGroup].filter((g) => g.sent >= 10).sort((a, b) => a.rate - b.rate)[0];
  const best = [...r.byGroup].filter((g) => g.sent >= 10).sort((a, b) => b.rate - a.rate)[0];
  const complaints = ex.replies.filter((x) => ["frete", "preco", "produto"].includes(x.category));
  const appeared = ex.replies.filter((x) => !["frete", "preco", "produto", "pediu_link", "sem_interesse"].includes(x.category));
  const compLabel = r.comparison.kind === "grupo_de_comparacao" ? `Grupo de comparação (${r.comparison.size})` : r.comparison.kind === "controle_e_nao_enviadas" ? `Ficaram sem mensagem (${r.comparison.size})` : "Clientes parecidas, sem contato";
  return (
    <>
      <PageHeader
        label={`Resultado · semana de ${fmtWeek(lastClosed.week_start)}`}
        title={
          <>
            A mensagem trouxe <span className="num">{r.returned}</span> pedidos. Sem ela, viriam <span className="num">{Math.round(r.sent * r.comparison.rate)}</span>.
          </>
        }
        sub={`Cruzamos quem recebeu a mensagem com os pedidos da loja nos ${Math.round((Date.parse(r.window.to) - Date.parse(r.window.from)) / 864e5)} dias seguintes. ${r.comparison.kind === "controle_e_nao_enviadas" ? "As clientes que ficaram sem mensagem entraram, junto com o grupo sorteado, na comparação." : r.comparison.kind === "grupo_de_comparacao" ? "Para comparar, usamos as clientes sorteadas que não receberam a mensagem." : "Para comparar, usamos clientes parecidas que não receberam nenhum contato."}`}
      />
      <LoopIndicator current={2} className="mb-6" />
      {r.comparison.weak && (
        <p className="st-hipotese rounded-xl p-4 bg-deep text-sm m-0 mb-5">Atenção: a comparação desta semana é mais fraca (grupo pequeno ou não sorteado). O resultado fica como hipótese até repetir.</p>
      )}
      <KpiRow>
        <Kpi label="Receberam" value={r.sent} detail="contado por você" status="hipotese" />
        <Kpi label="Voltaram a comprar" value={r.returned} detail="medido pela loja" />
        <Kpi label="Receita da missão" value={formatBRL(r.revenueCents)} detail="sem cupom, sem anúncio" />
        <Kpi label="Estimado × real" value={`${est} → ${r.returned}`} detail={r.sendStatus === "parte" ? `a estimativa era para ${lastClosed.plan.parts[0].targetIds.length + lastClosed.plan.parts[0].control.length} envios` : `a estimativa era de ${pct(lastClosed.plan.estimate.responseRate)}%, veio ${pct(r.rate)}%`} status="hipotese" />
      </KpiRow>
      <section className="mt-[26px] border border-[var(--rule)] rounded-[14px] p-[22px] bg-deep flex flex-col gap-4" aria-label="Com e sem a mensagem">
        <Label>Quanto voltou, com e sem a mensagem</Label>
        <VsRow label="Receberam a mensagem" rate={r.rate} kind="own" />
        <VsRow label={compLabel} rate={r.comparison.rate} kind="base" />
        <p className="lbl tracking-[0.12em] m-0">
          +{r.extraOrders} pedidos que não teriam acontecido · {formatBRL(r.extraRevenueCents)} a mais
        </p>
      </section>
      {r.byGroup.length > 0 && (
        <section className="mt-4 border border-[var(--rule)] rounded-[14px] overflow-hidden" aria-label="Resultado por grupo">
          {r.byGroup.map((g) => (
            <div key={g.segment} className="flex justify-between gap-3 px-4 py-3 border-t border-[var(--rule)] first:border-t-0 text-sm">
              <span>{segLabel(g.segment)}</span>
              <span className="lbl">
                {g.returned} de {g.sent} voltaram · {pct(g.rate)}%
              </span>
            </div>
          ))}
        </section>
      )}
      <div className="grid lg:grid-cols-3 gap-3.5 mt-[22px]">
        <Card status="fato" title="Funcionou">
          <ul className="m-0 pl-[18px] flex flex-col gap-1.5 text-sm text-duna">
            {best && (
              <li>
                Grupo {segLabel(best.segment)}: {best.returned} de {best.sent} voltaram ({pct(best.rate)}%).
              </li>
            )}
            {ex.ticketNoCouponCents != null && <li>Sem cupom, o ticket ficou em {formatBRL(ex.ticketNoCouponCents)}{ex.ticketWithCouponCents ? `, contra ${formatBRL(ex.ticketWithCouponCents)} dos pedidos com cupom nos 60 dias antes` : ""}.</li>}
            {r.rate > r.comparison.rate && (r.comparison.rate > 0 ? <li>Quem recebeu voltou {(r.rate / r.comparison.rate).toFixed(1).replace(".", ",")}× mais do que quem não recebeu.</li> : <li>Ninguém do grupo de comparação voltou na mesma semana.</li>)}
          </ul>
        </Card>
        <Card status="gargalo" title="Travou">
          <ul className="m-0 pl-[18px] flex flex-col gap-1.5 text-sm text-duna">
            {worst && worst !== best && (
              <li>
                {segLabel(worst.segment)}: só {worst.returned} de {worst.sent} voltaram ({pct(worst.rate)}%).
              </li>
            )}
            {complaints.map((c) => (
              <li key={c.category}>
                {c.count} {c.count === 1 ? "resposta" : "respostas"}: {c.label.toLowerCase()}.
              </li>
            ))}
            {!worst && !complaints.length && <li>Nada travou de forma clara nesta semana.</li>}
          </ul>
        </Card>
        <Card status="hipotese" title="Apareceu">
          <ul className="m-0 pl-[18px] flex flex-col gap-1.5 text-sm text-duna">
            {appeared.map((c) => (
              <li key={c.category}>
                {c.count} {c.count === 1 ? "cliente" : "clientes"}: {c.label.toLowerCase()}
                {c.excerpts[0] ? ` (“${c.excerpts[0]}”)` : ""}.
              </li>
            ))}
            {!appeared.length && <li>Sem respostas novas registradas. Mande os prints no próximo check-in.</li>}
          </ul>
        </Card>
      </div>
      {ex.simulated && <p className="lbl mt-4">Demonstração · os pedidos da semana foram simulados a partir da sua resposta</p>}
      <NextLink href="/app/marco-zero/ajuste">Ver o ajuste da próxima semana →</NextLink>
    </>
  );
}
