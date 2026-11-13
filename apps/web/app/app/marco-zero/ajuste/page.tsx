import Link from "next/link";
import { STRUCTURAL_MESSAGE } from "@ground/core";
import { Card, Label, LoopIndicator, PageHeader, Say } from "@ground/ui";
import { getMzPage } from "@/lib/mzPage";
import { NoData } from "@/components/NoData";
import { LearningsList } from "@/components/LearningsList";

export const metadata = { title: "Ajuste" };

export default async function Ajuste() {
  const { current, lastClosed, bundle, hasData } = await getMzPage();
  if (!hasData || !current) return <NoData />;
  if (!lastClosed) {
    return (
      <>
        <PageHeader label="Ajuste" title="O ajuste vem depois do primeiro check-in." sub="A missão nova nasce do resultado da anterior." />
        <Link href="/app/marco-zero/check-in" className="btn btn-solid">
          Ir para o check-in
        </Link>
      </>
    );
  }
  const r = bundle.results.get(lastClosed.id)!;
  const ran = r.sendStatus !== "nenhuma";
  const next = current.status === "aberta" && current.id !== lastClosed.id ? current : null;
  const plan = next?.plan;
  return (
    <>
      <PageHeader
        label={plan ? `Missão da semana · a partir de ${plan.weekStart.split("-").reverse().join("/")}` : "Ajuste"}
        title={ran ? "Continuar o que deu certo. Consertar o que travou." : "Uma missão do tamanho da sua semana."}
        sub={ran ? "A missão nova nasce do resultado da anterior. O que funcionou se repete com outro grupo; o que travou muda de forma antes de voltar." : "Missão que não sai não ensina nada. Então a próxima fica menor, com o que travou já resolvido no desenho dela."}
      />
      <LoopIndicator current={3} className="mb-6" />
      {plan && (
        <div className="grid md:grid-cols-2 gap-4">
          {plan.parts.map((p, i) => (
            <Card key={i} status={p.role === "extra" ? "hipotese" : p.role === "conserta" ? "hipotese" : ran ? "fato" : "fato"} title={`${p.role === "continua" ? "Continua · " : p.role === "conserta" ? "" : ""}${p.title}`} tag={p.role === "continua" ? (ran ? "Deu certo" : "Em aberto") : p.role === "conserta" ? "Em teste" : "Extra"}>
              <p className="m-0 text-sm text-duna">{p.detail}</p>
              {p.message && <div className="bg-wa text-carvao rounded-[12px_12px_4px_12px] px-3.5 py-3 text-[13.5px] leading-normal self-start whitespace-pre-line">{p.message}</div>}
            </Card>
          ))}
          {!ran && (
            <Card status="sem_info" title="Conserta · fica para depois">
              <p className="m-0 text-sm text-duna">Sem o resultado da primeira missão, ainda não dá para saber o que consertar. Uma missão por vez.</p>
            </Card>
          )}
        </div>
      )}
      {plan?.notes.map((n) => (
        <p key={n} className="font-mono text-[11px] tracking-[0.1em] text-duna border-l-2 border-bone pl-2.5 mt-4 mb-0">
          {n}
        </p>
      ))}
      <Label as="h2" className="block mt-[34px]">
        O que o Marco Zero já sabe sobre a sua base
      </Label>
      <LearningsList learnings={bundle.learnings} />
      {ran && (
        <section className="mt-[26px] border border-[var(--rule)] rounded-[14px] p-[22px] bg-deep flex flex-col gap-3" aria-label="Receita construída">
          <Label>Receita construída, a parte que é sua</Label>
          <div className="flex items-center gap-3.5 flex-wrap">
            <b className="font-display font-extrabold text-[34px] leading-none num">{Math.round(r.extras.builtShareBefore * 100)}%</b>
            <span className="lbl">→</span>
            <b className="font-display font-extrabold text-[34px] leading-none num">{Math.round(r.extras.builtShareAfter * 100)}%</b>
            <span className="text-duna text-sm">em uma semana, com {r.returned} clientes que voltaram.</span>
          </div>
        </section>
      )}
      <div className="mt-9 pt-6 border-t border-[var(--rule)]">
        <Say>{ran ? STRUCTURAL_MESSAGE : "Se a missão travar três semanas seguidas, o problema não é a mensagem. É a operação, e aí vale uma conversa."}</Say>
        <div className="flex flex-wrap gap-x-4 gap-y-2.5 items-center mt-5 text-[13.5px] text-duna">
          <Label>Gargalo estrutural?</Label>
          <Link href="/app/conversar?modulo=marco_zero" className="text-bone underline underline-offset-4">
            Converse com a Ground →
          </Link>
        </div>
        <div className="flex justify-end mt-6">
          <Link href="/app/marco-zero/missao" className="btn btn-solid">
            Ver a missão da semana →
          </Link>
        </div>
      </div>
    </>
  );
}
