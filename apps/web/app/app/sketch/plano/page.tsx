import Link from "next/link";
import { Label, PageHeader, Say } from "@ground/ui";
import { getSkPage } from "@/lib/skPage";
import { Missions } from "./Missions";

export const metadata = { title: "Sketch · Plano e missões" };

export default async function Plano() {
  const { data, sk } = await getSkPage();
  const codes = Object.fromEntries(sk.codes.filter((c) => c.mission_key).map((c) => [c.mission_key!, c.code]));
  const inPlan = (data?.channels ?? []).filter((c) => c.inPlan);
  const week = Math.max(1, ...sk.missions.map((m) => m.week));
  return (
    <>
      <PageHeader label={`Plano de aquisição · ${data?.planMonth ?? "este mês"}`} title={`${week === 1 ? "Primeira" : `${week}ª`} semana: ${sk.missions.filter((m) => m.week === week).length} missões.`} />
      <Missions missions={sk.missions.filter((m) => m.week === week)} codes={codes} />
      <section className="mt-8" aria-labelledby="plano-mes">
        <Label as="h2">
          <span id="plano-mes">O plano do mês</span>
        </Label>
        <ol className="mt-3 pl-5 text-sm text-duna flex flex-col gap-1.5">
          {inPlan
            .sort((a, b) => b.priority - a.priority)
            .map((c) => (
              <li key={c.key}>
                <b className="text-bone">{c.title}</b> · {c.detail}
              </li>
            ))}
        </ol>
        <p className="lbl tracking-[0.08em] mt-2">Semanas seguintes: 3 missões por semana, ajustadas pelo check-in</p>
      </section>
      <Say className="mt-8">Você sai com o plano e já dá os primeiros passos.</Say>
      <div className="flex justify-end mt-8 gap-2">
        <Link href="/app/sketch/check-in" className="btn btn-solid">
          Check-in da semana →
        </Link>
      </div>
    </>
  );
}
