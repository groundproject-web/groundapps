import Link from "next/link";
import { addDays, shouldSuggestSketch } from "@ground/core";
import { Card, Kpi, KpiRow, Label, PageHeader, Say } from "@ground/ui";
import { getOrgContext } from "@/lib/orgs";
import { TopBar } from "@/components/TopBar";
import { loadDataset } from "@/lib/store";
import { overview } from "@/lib/mz";
import { channelRepurchase, loadSketch, measuredNewSales } from "@/lib/sketch";
import { currentRules } from "@/lib/pricing";

export const metadata = { title: "Início" };

export default async function Home() {
  const ctx = await getOrgContext();
  const rules = await currentRules(ctx.today);
  const hasMz = ctx.modules.has("marco_zero");
  const hasSk = ctx.modules.has("sketch");
  const ds = hasMz ? await loadDataset(ctx.session.userId, ctx.org.id) : null;
  const ov = ds && ds.orders.length ? overview(ds, ctx.today) : null;

  let cycle: { newFromSketch: number; returned: number; builtShare: number } | null = null;
  if (ctx.integrated && ov) {
    const sk = await loadSketch(ctx);
    const rep = sk.profile ? await channelRepurchase(ctx, sk.profile.data.channels) : null;
    const newMonth = await measuredNewSales(ctx, addDays(ctx.today, -30));
    cycle = { newFromSketch: newMonth ?? 0, returned: rep?.total.returned ?? 0, builtShare: ov.baseline.recentBuiltShare };
  }
  const suggestSketch = hasMz && !hasSk && ov && shouldSuggestSketch(ov.baseline.monthly.filter((m) => m.totalCents > 0).map((m) => 1 - m.builtShare));

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar ctx={ctx} active="inicio" builtShare={ov?.baseline.recentBuiltShare ?? null} gamification={rules.gamificationEnabled && ctx.integrated} />
      <main id="conteudo" className="py-9 px-4 md:px-6 max-w-[1120px] w-full mx-auto">
        <PageHeader label={ctx.org.name} title={`Oi${ctx.org.owner_display_name ? `, ${ctx.org.owner_display_name}` : ""}. Onde olhar esta semana.`} />
        {!hasMz && !hasSk && (
          <Card status="sem_info" title="Seu plano ainda não foi liberado">
            <p className="m-0 text-sm text-duna">Monte o seu terreno e a Ground libera o acesso. Enquanto isso, nada é cobrado.</p>
            <Link href="/app/plano" className="btn btn-solid self-start">
              Monte o seu terreno
            </Link>
          </Card>
        )}
        {cycle && (
          <section aria-labelledby="ciclo" className="mb-8">
            <Label as="h2">
              <span id="ciclo">Ciclo · Sketch traz, Marco Zero faz voltar</span>
            </Label>
            <div className="mt-3">
              <KpiRow>
                <Kpi label="Clientes novas do Sketch no mês" value={cycle.newFromSketch} detail="medido por código de origem" status={cycle.newFromSketch ? "fato" : "sem_info"} />
                <Kpi label="Já voltaram" value={cycle.returned} detail="das que o Sketch trouxe" status={cycle.returned ? "fato" : "sem_info"} />
                <Kpi label="Receita construída" value={`${Math.round(cycle.builtShare * 100)}%`} detail="últimos 6 meses" />
              </KpiRow>
            </div>
          </section>
        )}
        <div className="grid md:grid-cols-2 gap-4">
          {hasSk && (
            <Card status="hipotese" title="Ground Sketch" tag="Aquisição">
              <Say>Você sai com o plano e já dá os primeiros passos.</Say>
              <Link href="/app/sketch" className="btn btn-solid self-start">
                Abrir o Sketch
              </Link>
            </Card>
          )}
          {hasMz && (
            <Card status="fato" title="Ground Marco Zero" tag="Recompra">
              <Say>A venda que você procura já está na sua base.</Say>
              {ov && <p className="m-0 text-sm text-duna">{ov.idle.goneCount.toLocaleString("pt-BR")} clientes compraram uma vez e sumiram.</p>}
              <Link href="/app/marco-zero" className="btn btn-solid self-start">
                Abrir o Marco Zero
              </Link>
            </Card>
          )}
        </div>
        {suggestSketch && (
          <Card status="hipotese" title="Sua aquisição ainda depende de anúncio" className="mt-6">
            <p className="m-0 text-sm text-duna">Nos últimos 2 meses, mais de 70% da receita veio de cliente nova. O Sketch mostra quem é a cliente que volta e onde ela está, sem depender de anúncio.</p>
            <Link href="/app/plano?modulo=sketch" className="btn self-start">
              Ver o Sketch e o combo
            </Link>
          </Card>
        )}
        <p className="text-sm text-duna mt-8">
          Algo que não cabe numa missão?{" "}
          <Link href="/app/conversar" className="text-bone underline underline-offset-4">
            Converse com a Ground
          </Link>
          .{" "}
          <Link href="/app/privacidade" className="text-bone underline underline-offset-4">
            Seus dados
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
