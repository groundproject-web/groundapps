import Link from "next/link";
import { weekStart } from "@ground/core";
import { Card, PageHeader } from "@ground/ui";
import { getSkPage } from "@/lib/skPage";
import { sketchCheckinAction } from "@/app/actions/sketch";

export const metadata = { title: "Sketch · Check-in" };

export default async function SkCheckin() {
  const { sk, ctx } = await getSkPage();
  const week = weekStart(ctx.today);
  const done = sk.checkins.find((c) => c.week === week);
  const doneMissions = sk.missions.filter((m) => m.done).length;
  return (
    <>
      <PageHeader label="Check-in da semana" title="Fez as missões? O que aconteceu?" sub={ctx.integrated ? "Um check-in só cobre os dois apps: depois deste, o Marco Zero pergunta da missão dele na mesma conversa." : "Leva 1 minuto. O que você contar fica como hipótese até a loja mostrar."} />
      {done && (
        <Card status="hipotese" title="Check-in desta semana feito" className="mb-5">
          <p className="m-0 text-sm text-duna">{done.answers.happened || "Sem comentário."}</p>
        </Card>
      )}
      <form action={sketchCheckinAction} className="flex flex-col gap-4 max-w-[640px]">
        <fieldset className="border-0 p-0 m-0 flex flex-col gap-2">
          <legend className="lbl mb-2">
            Você marcou {doneMissions} de {sk.missions.length} missões como feitas. Isso bate?
          </legend>
          {[
            ["todas", "Fiz todas"],
            ["parte", "Fiz uma parte"],
            ["nenhuma", "Não consegui"],
          ].map(([v, l]) => (
            <label key={v} className="flex gap-2 items-center">
              <input type="radio" name="did" value={v} required defaultChecked={done?.answers.did === v} className="accent-bone w-4 h-4" />
              {l}
            </label>
          ))}
        </fieldset>
        <label className="flex flex-col gap-1.5">
          <span className="lbl">O que aconteceu? (conversas, indicações, o que travou)</span>
          <textarea name="happened" rows={4} className="field" defaultValue={done?.answers.happened} />
        </label>
        {!ctx.integrated && (
          <label className="flex flex-col gap-1.5">
            <span className="lbl">Vendas para clientes novas nesta semana (sem loja conectada, é você quem conta)</span>
            <input name="sales" type="number" min={0} className="field !w-32" defaultValue={done?.answers.reportedNewSales} />
          </label>
        )}
        <div className="flex gap-2 flex-wrap">
          <button type="submit" className="btn btn-solid">
            Salvar check-in
          </button>
          {ctx.integrated && (
            <Link href="/app/marco-zero/check-in" className="btn">
              Seguir para a missão do Marco Zero
            </Link>
          )}
        </div>
      </form>
    </>
  );
}
