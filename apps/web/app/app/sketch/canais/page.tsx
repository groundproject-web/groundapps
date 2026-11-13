import Link from "next/link";
import { formatBRL, validateTrafficTest } from "@ground/core";
import { Card, PageHeader } from "@ground/ui";
import { getSkPage } from "@/lib/skPage";
import { channelRepurchase, suggestionVisible } from "@/lib/sketch";
import { suggestionAction } from "@/app/actions/sketch";
import { Channels } from "./Channels";

export const metadata = { title: "Sketch · Onde ela está" };

export default async function Canais() {
  const { data, plan, sk, ctx } = await getSkPage();
  if (!data) return <PageHeader label="Onde ela está" title="Ainda sem mapa de canais." />;
  const rep = await channelRepurchase(ctx, data.channels);
  const notes = Object.fromEntries((rep?.rows ?? []).filter((r) => r.acquired > 0).map((r) => [r.channelKey, { note: r.sentence, priority: r.newPriority, status: r.status }]));
  const t = data.traffic;
  const errs = validateTrafficTest(t);
  const later = t.phase === "depois";
  const key = "sketch_inicio_para_completo:trafego" as const;
  return (
    <>
      <PageHeader label={data.path === 2 ? "Onde ela está" : "Onde ele está"} title={data.channelsTitle} sub="Toque em um canal para tirar ou colocar no plano do mês." />
      <Channels channels={data.channels} notes={notes} />
      {rep && rep.total.acquired > 0 && <p className="lbl tracking-[0.08em] mt-3">Prioridade ajustada pela recompra: canais que trazem quem volta sobem; os outros viram hipótese a revisar.</p>}
      {!ctx.integrated && <p className="lbl tracking-[0.08em] mt-3">Recompra por canal: disponível com o Marco Zero.</p>}
      <div className="grid md:grid-cols-2 gap-3.5 mt-5">
        <Card status={later ? "sem_info" : "hipotese"} title={`Teste de tráfego${later ? " · depois" : ""}`}>
          <div className={`font-display font-extrabold text-[44px] leading-none num ${later ? "text-duna" : ""}`}>{formatBRL(t.budgetCents)}</div>
          <p className="m-0 text-sm text-duna">
            {later ? "Só quando a mensagem estiver validada no boca a boca. Por enquanto, fica de fora." : `Só para testar a mensagem “${t.message.replace(/\.$/, "")}”, com limite de ${t.days} dias. ${t.stopRule}`}
          </p>
          {!later && errs.length === 0 && <span className="lbl">Verba · prazo · uma mensagem · regra de parada</span>}
          {plan === "inicio" && suggestionVisible(sk.memory, key, ctx.today) && (
            <form action={suggestionAction} className="flex flex-col gap-2 border-t border-[var(--rule)] pt-3">
              <p className="m-0 text-sm">O teste de tráfego guiado faz parte do Sketch Completo.</p>
              <input type="hidden" name="key" value={key} />
              <div className="flex gap-2 flex-wrap">
                <button name="action" value="accepted" className="btn btn-solid" type="submit">
                  Conhecer o Completo
                </button>
                <button name="action" value="dismissed" className="btn" type="submit">
                  Agora não
                </button>
              </div>
            </form>
          )}
        </Card>
      </div>
      <div className="flex justify-end mt-8">
        <Link href="/app/sketch/plano" className="btn btn-solid">
          Ver o plano do mês →
        </Link>
      </div>
    </>
  );
}
