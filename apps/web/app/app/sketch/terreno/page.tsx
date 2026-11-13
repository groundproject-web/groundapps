import Link from "next/link";
import { daysBetween } from "@ground/core";
import { Card, Matrix, PageHeader } from "@ground/ui";
import { getSkPage } from "@/lib/skPage";
import { suggestionVisible } from "@/lib/sketch";
import { suggestionAction } from "@/app/actions/sketch";

export const metadata = { title: "Sketch · O terreno ao redor" };

export default async function Terreno() {
  const { data, gap, plan, sk, ctx } = await getSkPage();
  if (!data?.matrix) {
    return <PageHeader label="O terreno ao redor" title="A pesquisa de concorrência ainda não rodou." sub="Ela usa só fontes públicas e mostra a fonte de cada afirmação. Fica ativa quando os sócios aprovarem as fontes." />;
  }
  const others = data.matrix.rows.filter((r) => !r.isYou).length;
  const readAt = sk.profile?.research_read_at ?? data.matrix.readAt.slice(0, 10);
  const stale = daysBetween(readAt, ctx.today) > 60;
  const key = "sketch_inicio_para_completo:terreno_desatualizado" as const;
  return (
    <>
      <PageHeader label={`O terreno ao redor · ${others} marcas disputam ${data.path === 2 ? "essa cliente" : "esse público"}`} title={data.terrainTitle} sub="O que cada marca promete na comunicação e nas embalagens. A coluna hachurada é o espaço que ninguém ocupa. Concorrente aqui não é quem cobra menos." />
      <Matrix matrix={data.matrix} gapColumn={gap} />
      <p className="lbl tracking-[0.08em] mt-3">
        Cada ponto guarda a URL, a data e o trecho lido · leitura de {readAt.split("-").reverse().join("/")}
        {ctx.org.is_demo ? " · fontes de demonstração (example.com)" : ""}
      </p>
      <div className="grid md:grid-cols-2 gap-[18px] mt-5">
        {data.emptySpace && (
          <Card status="gargalo" title={data.emptySpace.title} tag="Espaço vazio">
            <p className="m-0 text-sm text-duna">{data.emptySpace.text}</p>
          </Card>
        )}
        {data.hypothesis && (
          <Card status="hipotese" title={data.hypothesis.title} tag="Hipótese a testar">
            <p className="m-0 text-sm text-duna">{data.hypothesis.text}</p>
          </Card>
        )}
      </div>
      {plan === "inicio" && stale && suggestionVisible(sk.memory, key, ctx.today) && (
        <Card status="hipotese" title="O terreno mudou desde a última leitura?" className="mt-5">
          <p className="m-0 text-sm text-duna">A leitura tem mais de 60 dias. No Sketch Completo, o terreno ao redor é atualizado todo mês e o app mostra o que mudou.</p>
          <form action={suggestionAction} className="flex gap-2 flex-wrap">
            <input type="hidden" name="key" value={key} />
            <button name="action" value="accepted" className="btn btn-solid" type="submit">
              Conhecer o Completo
            </button>
            <button name="action" value="dismissed" className="btn" type="submit">
              Agora não
            </button>
          </form>
        </Card>
      )}
      <div className="flex justify-end mt-8">
        <Link href="/app/sketch/canais" className="btn btn-solid">
          Ver onde {data.path === 2 ? "ela" : "ele"} está →
        </Link>
      </div>
    </>
  );
}
