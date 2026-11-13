import Link from "next/link";
import { daysBetween, SEND_LABEL, BLOCKER_LABEL } from "@ground/core";
import { Card, LoopIndicator, PageHeader } from "@ground/ui";
import { getMzPage } from "@/lib/mzPage";
import { NoData } from "@/components/NoData";
import { stagingTools } from "@/lib/env";
import { advanceWeekAction, undoCheckinAction } from "@/app/actions/mz";
import { CheckinChat } from "./CheckinChat";

export const metadata = { title: "Check-in" };

function SidePanel({ n }: { n: number }) {
  return (
    <div className="flex flex-col gap-3.5">
      <Card status="fato" title="Medido pela loja" tag="Fato · automático">
        <ul className="m-0 pl-[18px] flex flex-col gap-1.5 text-sm text-duna">
          <li>Quem das {n} clientes comprou de novo</li>
          <li>Quando comprou e quanto gastou</li>
          <li>Quem não recebeu a mensagem, para comparar</li>
        </ul>
      </Card>
      <Card status="hipotese" title="Contado por você" tag="1 minuto">
        <ul className="m-0 pl-[18px] flex flex-col gap-1.5 text-sm text-duna">
          <li>Se a mensagem saiu, e para quantas</li>
          <li>O que travou, se algo travou</li>
          <li>As respostas das clientes, em print ou texto</li>
        </ul>
      </Card>
      <p className="font-mono text-[11px] tracking-[0.1em] text-duna border-l-2 border-bone pl-2.5 m-0">Também dá para responder pelo WhatsApp, quando o canal estiver ativo.</p>
    </div>
  );
}

export default async function CheckIn() {
  const { current, lastClosed, ctx, bundle, hasData } = await getMzPage();
  if (!hasData || !current) return <NoData />;
  const ended = daysBetween(current.week_start, ctx.today) >= 7;
  const advance = stagingTools && ctx.org.is_demo && (
    <form action={advanceWeekAction}>
      <input type="hidden" name="back" value="/app/marco-zero/check-in" />
      <button type="submit" className="btn">
        Avançar uma semana (staging)
      </button>
    </form>
  );

  // a missão aberta ainda está rolando: mostra o último check-in feito (se houver)
  if (current.status === "aberta" && !ended) {
    const done = lastClosed ? bundle.checkins.get(lastClosed.id) : null;
    return (
      <>
        <PageHeader label="Check-in" title={done ? "Check-in feito. A próxima missão já está rolando." : "A missão está rolando."} sub={`O check-in abre ${7 - daysBetween(current.week_start, ctx.today) === 1 ? "amanhã" : `em ${7 - daysBetween(current.week_start, ctx.today)} dias`}, na segunda. Você recebe um lembrete por e-mail.`} />
        <LoopIndicator current={done ? 3 : 0} className="mb-6" />
        {done && lastClosed && (
          <Card status="hipotese" title="O que você contou na semana passada">
            <p className="m-0 text-sm">
              {SEND_LABEL[done.sendStatus]}
              {done.sendStatus === "parte" && done.sentCount ? ` (${done.sentCount})` : ""}
              {done.blocker ? ` · ${BLOCKER_LABEL[done.blocker]}` : ""}
            </p>
            <div className="flex gap-2 flex-wrap">
              <Link href="/app/marco-zero/resultado" className="btn btn-solid">
                Ver o resultado
              </Link>
              <form action={undoCheckinAction}>
                <input type="hidden" name="missionId" value={lastClosed.id} />
                <button type="submit" className="btn">
                  Responder de outro jeito
                </button>
              </form>
            </div>
          </Card>
        )}
        <div className="mt-6 flex gap-3 flex-wrap">
          <Link href="/app/marco-zero/missao" className="btn">
            Ver a missão
          </Link>
          {advance}
        </div>
      </>
    );
  }

  const n = current.plan.parts[0].targetIds.length;
  const product = current.plan.productCycle?.product.replace(/\s*\d+\s?(g|kg).*$/i, "").toLowerCase();
  return (
    <>
      <PageHeader label="Check-in · segunda-feira" title={`Como foi a missão${product ? ` do ${product}` : ""}?`} sub="O Marco Zero mede sozinho o que a loja mostra. Só pergunta o que só você sabe: se a mensagem saiu, para quem, e o que as clientes responderam." />
      <LoopIndicator current={1} className="mb-6" />
      <div className="grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,.9fr)] gap-6 items-start">
        <CheckinChat missionId={current.id} owner={ctx.org.owner_display_name} total={n} productLabel={product ?? "da semana"} />
        <SidePanel n={n} />
      </div>
    </>
  );
}
