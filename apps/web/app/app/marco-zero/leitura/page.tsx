import { formatBRL, formatInt } from "@ground/core";
import { Kpi, KpiRow, Label, RentedBuiltChart, Say } from "@ground/ui";
import { getMzPage } from "@/lib/mzPage";
import { NextLink, NoData } from "@/components/NoData";

export const metadata = { title: "Seu marco zero" };

export default async function Leitura() {
  const { ov } = await getMzPage();
  if (!ov) return <NoData />;
  const b = ov.baseline;
  const recentRented = 1 - b.recentBuiltShare;
  const since = b.firstOrderDate ? b.firstOrderDate.slice(0, 4) : "";
  return (
    <>
      <div className="border-l-2 border-bone pl-5 mb-7">
        <Label>Seu marco zero · últimos 6 meses</Label>
        <Say big className="mt-2">
          A venda que você procura já está na sua base.
        </Say>
      </div>
      <KpiRow>
        <Kpi label="Clientes na base" value={formatInt(b.customers)} detail={`${formatInt(b.orders)} pedidos desde ${since}`} />
        <Kpi label="Taxa de recompra" value={`${Math.round(b.repurchaseRate * 100)}%`} detail={`${formatInt(b.repeatCustomers)} clientes compraram mais de uma vez`} />
        <Kpi
          label="Até a 2ª compra"
          value={b.daysToSecondMedian != null ? `${Math.round(b.daysToSecondMean!)} dias` : "—"}
          status={b.daysToSecondMedian != null ? "fato" : "sem_info"}
          detail={b.daysToSecondMedian != null ? `Média entre o 1º e o 2º pedido · mediana ${Math.round(b.daysToSecondMedian)} dias` : "Ninguém voltou ainda"}
        />
        <Kpi label="LTV médio" value={formatBRL(b.ltvCents)} detail="Quanto cada cliente gastou, somando tudo" />
      </KpiRow>
      <section className="mt-[30px] border border-[var(--rule)] rounded-[14px] p-[22px] bg-deep" aria-labelledby="receita">
        <div className="flex justify-between gap-3 flex-wrap items-baseline">
          <Label as="h2">
            <span id="receita">Receita por mês · R$ mil</span>
          </Label>
          <span className="lbl tracking-[0.12em]">Hachura tracejada = cliente nova · sólido = cliente que voltou</span>
        </div>
        <RentedBuiltChart data={b.monthly} partialLast={Number(b.asOf.slice(8, 10)) < 28} />
        {Number(b.asOf.slice(8, 10)) < 28 && <p className="lbl tracking-[0.08em] m-0">* mês em andamento</p>}
        <div className="grid sm:grid-cols-2 gap-4 mt-[18px]">
          <div className="flex gap-2.5 items-start">
            <i className="flex-none w-[26px] h-3.5 rounded-[3px] mt-1 border-[1.5px] border-dashed border-bone" style={{ background: "repeating-linear-gradient(-48deg,rgba(242,239,231,.55) 0 1.4px,transparent 1.4px 5px)" }} aria-hidden />
            <div>
              <b className="font-display font-extrabold text-[22px] block leading-tight num">{Math.round(recentRented * 100)}%</b>
              <span>da receita vem de cliente nova. É o crescimento alugado: depende de anúncio para continuar.</span>
            </div>
          </div>
          <div className="flex gap-2.5 items-start">
            <i className="flex-none w-[26px] h-3.5 rounded-[3px] mt-1 bg-bone" aria-hidden />
            <div>
              <b className="font-display font-extrabold text-[22px] block leading-tight num">{Math.round(b.recentBuiltShare * 100)}%</b>
              <span>vem de quem voltou. É o crescimento construído, o terreno que já é seu.</span>
            </div>
          </div>
        </div>
      </section>
      <p className="lbl tracking-[0.1em] mt-4">Fato · calculado a partir de todos os pedidos da base. No histórico inteiro, {Math.round((1 - b.builtShare) * 100)}% da receita foi de primeira compra.</p>
      <NextLink href="/app/marco-zero/dinheiro-parado">Ver o dinheiro parado →</NextLink>
    </>
  );
}
