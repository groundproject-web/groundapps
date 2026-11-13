import Link from "next/link";
import { controlSentence, formatBRL } from "@ground/core";
import { Card, Label, LoopIndicator, MissionCard, PageHeader, Say } from "@ground/ui";
import { getMzPage } from "@/lib/mzPage";
import { NoData } from "@/components/NoData";
import { MessageEditor } from "./MessageEditor";

export const metadata = { title: "Missão da semana" };

const fmt = (d: string) => {
  const [, m, day] = d.split("-");
  const months = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  return `${Number(day)} de ${months[Number(m) - 1]}`;
};
const addDays = (d: string, n: number) => new Date(Date.parse(d + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);

export default async function Missao() {
  const { current, ctx, ov, bundle } = await getMzPage();
  if (!ov || !current) return <NoData />;
  const plan = current.plan;
  const open = current.status === "aberta";
  const storeShort = ctx.org.name.split(" ")[0];
  const hasAlert = bundle.alerts.length > 0;
  return (
    <>
      <PageHeader
        label={`Missão da semana · ${fmt(current.week_start)} a ${fmt(addDays(current.week_start, 6))}`}
        title={plan.parts.length > 1 || plan.smaller ? plan.headline : plan.headline}
        sub={plan.subtitle}
      />
      {!open && (
        <p className="st-fato rounded-xl p-4 bg-deep text-sm m-0 mb-6">
          Esta missão já teve check-in.{" "}
          <Link href="/app/marco-zero/resultado" className="underline underline-offset-4">
            Ver o resultado
          </Link>
          .
        </p>
      )}
      {plan.parts.map((part, i) => (
        <section key={i} className={i > 0 ? "mt-10 pt-8 border-t border-[var(--rule)]" : ""} aria-label={part.title}>
          {plan.parts.length > 1 && (
            <h2 className="font-display font-semibold text-xl mb-4 mt-0">
              {part.role === "continua" ? "Continua · " : part.role === "conserta" ? "Conserta · " : ""}
              {part.title.replace(/^Conserta · /, "")}
            </h2>
          )}
          {part.role === "extra" ? (
            <Card status="hipotese" title={part.title}>
              <p className="m-0 text-sm text-duna">{part.detail}</p>
            </Card>
          ) : (
            <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,.9fr)] gap-7 items-start">
              <MissionCard
                why={i === 0 ? plan.why : [part.detail]}
                estimate={i === 0 ? { orders: plan.estimate.orders, revenue: formatBRL(plan.estimate.revenueCents), rateLabel: `Se ${Math.round(plan.estimate.responseRate * 100)}% responderem` } : undefined}
              >
                <div className="border-t border-[var(--rule)] pt-3 flex flex-col gap-2">
                  <span className="lbl">A lista</span>
                  <p className="m-0 text-sm">
                    {part.targetIds.length} clientes recebem.{part.batches ? ` Em ${part.batches} lotes de até 50, um por dia.` : ""}
                  </p>
                  {part.control.length > 0 && <p className="m-0 text-sm text-duna">{controlSentence(part.control.length)}</p>}
                  <div className="flex gap-2 flex-wrap">
                    <a className="btn" href={`/api/mz/lista?missao=${current.id}&parte=${i}`} download>
                      Exportar lista (CSV)
                    </a>
                  </div>
                  <p className="lbl tracking-[0.08em] m-0">O app não envia mensagens. Você copia e manda do seu WhatsApp.</p>
                </div>
              </MissionCard>
              <MessageEditor missionId={current.id} storeName={ctx.org.name} initial={i === 0 ? (current.message_override ?? part.message) : part.message} persist={i === 0 && open} />
            </div>
          )}
        </section>
      ))}
      {plan.notes.length > 0 && (
        <div className="mt-6 flex flex-col gap-2">
          {plan.notes.map((n) => (
            <p key={n} className="font-mono text-[11px] tracking-[0.1em] text-duna border-l-2 border-bone pl-2.5 m-0">
              {n}
            </p>
          ))}
        </div>
      )}
      <div className="mt-9 pt-6 border-t border-[var(--rule)]">
        <Say big>Em vez de investir mais em anúncio, recupere quem já te conhece. É mais barato e mais rápido.</Say>
        <LoopIndicator current={0} className="my-4" />
        <p className="sub m-0 mb-1.5">A missão não termina no envio. Na segunda, o Marco Zero pergunta como foi, mede na loja quem voltou e ajusta a próxima semana.</p>
        <div className="flex justify-end gap-2.5 mt-3.5">
          <Link href="/app/marco-zero/check-in" className="btn btn-solid">
            Uma semana depois: o check-in →
          </Link>
        </div>
        {(plan.structuralInvite || hasAlert) && (
          <div className="flex flex-wrap gap-x-4 gap-y-2.5 items-center mt-5 text-[13.5px] text-duna">
            <Label>Gargalo estrutural?</Label>
            <Link href={`/app/conversar?modulo=marco_zero&assunto=${encodeURIComponent(bundle.alerts[0]?.signal_type ?? "gargalo")}`} className="text-bone underline underline-offset-4">
              Converse com a Ground →
            </Link>
          </div>
        )}
        <p className="text-[13.5px] text-duna mt-4">
          Quer conversar sobre algo que não cabe numa missão?{" "}
          <Link href="/app/conversar?modulo=marco_zero" className="text-bone underline underline-offset-4">
            Converse com a Ground
          </Link>
          . Loja: {storeShort}.
        </p>
      </div>
    </>
  );
}
