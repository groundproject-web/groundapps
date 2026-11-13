import { addDays } from "@ground/core";
import { Card, Label, PageHeader, Say } from "@ground/ui";
import { getSkPage } from "@/lib/skPage";
import { channelRepurchase, measuredNewSales, suggestionVisible, suggestMzFromLater } from "@/lib/sketch";
import { simulateSketchMonthAction, suggestionAction } from "@/app/actions/sketch";
import { stagingTools } from "@/lib/env";

export const metadata = { title: "Sketch · Primeiros sinais" };

export default async function Sinais() {
  const { data, sk, ctx } = await getSkPage();
  if (!data) return <PageHeader label="Primeiros sinais" title="Ainda sem plano." />;
  const measured = ctx.integrated ? await measuredNewSales(ctx, addDays(ctx.today, -90)) : null;
  const rep = await channelRepurchase(ctx, data.channels);
  const reported = sk.checkins.reduce((s, c) => s + (c.answers.reportedNewSales ?? 0), 0);
  const showMz = !ctx.modules.has("marco_zero") && suggestMzFromLater(data) && suggestionVisible(sk.memory, "sketch_para_mz", ctx.today);
  return (
    <>
      <PageHeader label="Fim do mês · primeiros sinais" title="O que trouxe sinal continua. O que não trouxe muda ou sai." sub="Os primeiros sinais medem o começo: conversas, indicações e vendas para clientes novas. Com a loja conectada, as vendas são medidas; sem ela, você conta e elas ficam como hipótese." />
      <Card status="fato" title={undefined} className="!gap-4">
        <div className="flex justify-between">
          <Label>Primeiros sinais</Label>
          <span className="lbl">{measured != null ? "Vendas medidas pela loja" : "Simulação de demonstração"}</span>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {data.signals.map((s) => {
            const isSales = /venda/.test(s.label);
            const value = isSales && measured != null && measured > 0 ? measured : isSales && reported ? reported : s.value;
            return (
              <div key={s.label} className={`pt-3 px-0.5 flex flex-col gap-1 border-t-2 ${isSales && measured ? "border-solid" : "border-dashed"} border-bone`}>
                <span className="font-display font-extrabold text-[clamp(30px,3vw,40px)] leading-none num">{value}</span>
                <span className="text-[13px] text-duna">{s.label}</span>
              </div>
            );
          })}
        </div>
        {ctx.integrated && (
          <div className="flex items-center gap-3.5 flex-wrap mt-1.5">
            <span className="st-fato rounded-[10px] px-3.5 py-2.5 font-display font-semibold">Sketch traz a cliente certa</span>
            <span className="font-mono text-duna">→ {rep?.total.acquired || data.signals.find((s) => /venda/.test(s.label))?.value} novas clientes →</span>
            <span className="st-hipotese rounded-[10px] px-3.5 py-2.5 font-display font-semibold">Marco Zero faz ela voltar</span>
          </div>
        )}
      </Card>

      <section className="mt-7" aria-labelledby="recompra">
        <Label as="h2">
          <span id="recompra">Recompra por canal de origem</span>
        </Label>
        {!ctx.integrated ? (
          <Card status="sem_info" title="Disponível com o Marco Zero." className="mt-3">
            <p className="m-0 text-sm text-duna">As vendas novas por código de origem podem ser medidas com a loja conectada. Saber quem VOLTA de cada canal precisa do Marco Zero.</p>
          </Card>
        ) : rep && rep.total.acquired > 0 ? (
          <ul className="list-none p-0 mt-3 border border-[var(--rule)] rounded-[14px] overflow-hidden">
            {rep.rows.map((r) => (
              <li key={r.channelKey} className="flex justify-between gap-3 px-4 py-3.5 border-t border-[var(--rule)] first:border-t-0 text-sm flex-wrap">
                <span>{r.sentence}</span>
                <span className="lbl inline-flex items-center gap-2">
                  <i className={`swatch swatch-${r.status}`} aria-hidden />
                  {r.acquired ? `prioridade ${r.oldPriority} → ${r.newPriority}` : "sem dados"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-duna mt-3">Ainda nenhuma cliente chegou com código de origem.</p>
        )}
        {ctx.integrated && <p className="lbl tracking-[0.08em] mt-2">A aquisição é medida pela recompra, não pela primeira venda.</p>}
        {stagingTools && ctx.org.is_demo && ctx.integrated && (
          <form action={simulateSketchMonthAction} className="mt-3">
            <button className="btn" type="submit">
              Simular o mês do Sketch (staging)
            </button>
          </form>
        )}
      </section>

      <section className="mt-7" aria-labelledby="ajuste">
        <Label as="h2">
          <span id="ajuste">Ajuste do mês</span>
        </Label>
        <div className="grid md:grid-cols-2 gap-3.5 mt-3">
          <Card status="fato" title="Continua">
            <ul className="m-0 pl-[18px] text-sm text-duna flex flex-col gap-1">
              {(rep?.rows.filter((r) => r.status === "fato").map((r) => data.channels.find((c) => c.key === r.channelKey)?.title) ?? data.channels.filter((c) => c.inPlan && c.priority >= 4).map((c) => c.title)).map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </Card>
          <Card status="hipotese" title="Muda ou sai">
            <ul className="m-0 pl-[18px] text-sm text-duna flex flex-col gap-1">
              {(rep?.rows.filter((r) => r.status === "hipotese").map((r) => data.channels.find((c) => c.key === r.channelKey)?.title) ?? data.channels.filter((c) => !c.inPlan || c.priority < 3).map((c) => c.title)).map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      {showMz && data.later && (
        <section className="mt-9 st-fato rounded-2xl p-[26px] bg-deep flex flex-col gap-3.5" aria-labelledby="base">
          <Label as="h2">
            <span id="base">Quando a base chega</span>
          </Label>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              [data.later.withContact, "clientes com nome e contato"],
              [data.later.repeatBuyers, "já compraram duas vezes"],
              [data.later.daysToSecond, "dias, em média, até a 2ª compra"],
            ].map(([v, l]) => (
              <div key={String(l)} className="pt-3 border-t-2 border-bone flex flex-col gap-1">
                <span className="font-display font-extrabold text-4xl leading-none num">{v}</span>
                <span className="text-[13px] text-duna">{l}</span>
              </div>
            ))}
          </div>
          <Say>Você já tem clientes voltando. O Marco Zero pode te mostrar quem está perto de recomprar.</Say>
          <form action={suggestionAction} className="flex gap-2.5 flex-wrap">
            <input type="hidden" name="key" value="sketch_para_mz" />
            <button className="btn btn-solid" name="action" value="accepted" type="submit">
              Conhecer o Marco Zero
            </button>
            <button className="btn" name="action" value="dismissed" type="submit">
              Agora não, seguir com o Sketch
            </button>
          </form>
        </section>
      )}
    </>
  );
}
