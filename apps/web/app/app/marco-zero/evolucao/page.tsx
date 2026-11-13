import { formatBRL, SIGNAL_LABEL } from "@ground/core";
import { Card, Label, PageHeader } from "@ground/ui";
import { getMzPage } from "@/lib/mzPage";
import { weeklyBuiltShare } from "@/lib/mz";
import { NoData } from "@/components/NoData";
import { LearningsList } from "@/components/LearningsList";

export const metadata = { title: "Evolução" };

export default async function Evolucao() {
  const { ds, ctx, bundle, hasData } = await getMzPage();
  if (!hasData) return <NoData />;
  const weeks = weeklyBuiltShare(ds, ctx.today, 8);
  const max = Math.max(0.01, ...weeks.map((w) => w.share));
  const badges = bundle.missions
    .map((m) => ({ m, r: bundle.results.get(m.id) }))
    .filter((x) => x.r && x.r.sendStatus !== "nenhuma" && !x.r.comparison.weak);
  return (
    <>
      <PageHeader label="O que a loja já sabe" title="A memória da sua loja." sub="Cada missão deixa um aprendizado. O que se repete vira fato; o que falha duas vezes sai." />
      <section aria-labelledby="evol" className="border border-[var(--rule)] rounded-[14px] p-[22px] bg-deep">
        <h2 id="evol" className="lbl m-0">
          % da receita construída, semana a semana
        </h2>
        <ol className="list-none p-0 mt-4 mb-0 grid grid-cols-8 gap-2 items-end h-44" aria-label="Receita construída por semana">
          {weeks.map((w) => (
            <li key={w.week} className="flex flex-col items-center gap-1.5 h-full justify-end">
              <span className="font-display font-semibold text-xs num">{Math.round(w.share * 100)}%</span>
              <span className="w-full bg-bone rounded-sm" style={{ height: `${(w.share / max) * 100}%`, minHeight: 2 }} />
              <span className="font-mono text-[10px] text-duna">{w.week.slice(8, 10)}/{w.week.slice(5, 7)}</span>
            </li>
          ))}
        </ol>
        <p className="lbl mt-3 mb-0 tracking-[0.08em]">Janela móvel de 4 semanas · fato, medido pelos pedidos</p>
      </section>
      <Label as="h2" className="block mt-8">
        Aprendizados
      </Label>
      <LearningsList learnings={bundle.learnings} />
      {badges.length > 0 && (
        <>
          <Label as="h2" className="block mt-8">
            Missões com resultado medido
          </Label>
          <ul className="list-none p-0 mt-3 flex flex-wrap gap-2">
            {badges.map(({ m, r }) => (
              <li key={m.id} className="st-fato rounded-full px-3.5 py-1.5 font-mono text-[11px] tracking-[0.1em] uppercase">
                {m.plan.parts[0].title} · +{r!.extraOrders} pedidos · {formatBRL(r!.extraRevenueCents)}
              </li>
            ))}
          </ul>
        </>
      )}
      {bundle.alerts.length > 0 && (
        <div className="mt-8 grid gap-3">
          {bundle.alerts.map((a, i) => (
            <Card key={i} status="gargalo" title={`Gargalo estrutural: ${SIGNAL_LABEL[a.signal_type] ?? a.signal_type}`}>
              <p className="m-0 text-sm text-duna">Apareceu {a.weeks.length} semanas seguidas. Deixou de ser uma missão: virou um assunto de estrutura.</p>
              <a href={`/app/conversar?modulo=marco_zero&assunto=${a.signal_type}`} className="btn self-start">
                Converse com a Ground
              </a>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
