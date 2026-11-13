import Link from "next/link";
import { Card, Label, PageHeader } from "@ground/ui";
import { getSkPage } from "@/lib/skPage";

export const metadata = { title: "Sketch · Quem é a cliente" };

export default async function Cliente() {
  const { data, sk, ctx } = await getSkPage();
  const p = data?.persona;
  if (!p) {
    return (
      <>
        <PageHeader label="Quem é a cliente" title="Ainda sem leitura." sub={`Responda a conversa de entrada e mande prints de comentários e avaliações. ${sk.sourceCount} fontes lidas até agora.`} />
        <Card status="sem_info" title="Persona">
          <p className="m-0 text-sm text-duna">Com poucas fontes, a persona sairia inventada. Aqui, toda frase precisa vir de uma fonte real.</p>
        </Card>
      </>
    );
  }
  // no caminho 2, a persona é fato só com o Marco Zero ativo
  const status = p.status === "fato" && !ctx.integrated ? "hipotese" : p.status;
  const max = Math.max(...p.expressions.map((e) => e.count));
  const noun = data.path === 2 ? "ela" : "ele";
  return (
    <>
      <PageHeader label={`Quem é a cliente · ${data.readLabel}`} title={data.path === 2 ? "Ela não é a frequentadora típica de academia." : "Ele está cansado de camiseta que desbota."} sub={data.path === 2 ? "Cruzando as clientes que recompram com as avaliações da marca e de marcas parecidas, o perfil que aparece é outro." : "Comentários do Instagram e avaliações de marcas parecidas apontam para o mesmo perfil."} />
      <div className="grid lg:grid-cols-2 gap-[18px]">
        <Card status={status} title={p.profile} tag={status === "fato" ? p.evidenceLabel : `Hipótese${p.strength ? ` ${p.strength}` : ""}`}>
          <p className="m-0 text-[14.5px] text-duna">{p.description}</p>
          <blockquote className="m-0 mt-1.5">
            <p className="font-serif text-[clamp(24px,2.6vw,32px)] leading-tight m-0">“{p.topQuote.text.charAt(0).toUpperCase() + p.topQuote.text.slice(1)}.”</p>
            <footer className="lbl tracking-[0.12em] mt-2">
              {data.path === 2 ? "A frase mais citada nas avaliações" : "A reclamação mais citada sobre as outras marcas"} · {p.topQuote.count} fontes
            </footer>
          </blockquote>
        </Card>
        <div className="border border-[var(--rule)] rounded-[14px] p-5 bg-deep flex flex-col gap-3">
          <Label>O que {noun} fala, nas palavras {data.path === 2 ? "dela" : "dele"}</Label>
          <ul className="list-none p-0 m-0 flex flex-col gap-2.5">
            {p.expressions.map((e) => (
              <li key={e.text} className="grid grid-cols-[minmax(0,1fr)_52px] gap-2.5 items-center text-sm">
                <div className="flex flex-col gap-1.5">
                  <details>
                    <summary className="cursor-pointer list-none">“{e.text}”</summary>
                    <div className="mt-2 text-xs text-duna flex flex-col gap-1">
                      <span className="lbl">Fontes ({e.sources.length} de {e.count})</span>
                      {e.sources.slice(0, 3).map((s) => (
                        <span key={s.ref}>
                          {s.ref} · {s.kind.replace("_", " ")}
                          {s.url ? ` · ${new URL(s.url).hostname}` : ""}: “{s.excerpt}”
                        </span>
                      ))}
                    </div>
                  </details>
                  <span className="h-2.5 rounded-full bg-[rgba(242,239,231,.08)] overflow-hidden" aria-hidden>
                    <i className="block h-full bg-bone rounded-full" style={{ width: `${Math.round((e.count / max) * 100)}%` }} />
                  </span>
                </div>
                <span className="font-mono text-xs text-right text-duna num">{e.count}×</span>
              </li>
            ))}
          </ul>
          <p className="lbl tracking-[0.08em] m-0">Citações reais, contadas nas fontes · toque para ver a origem</p>
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-3.5 mt-[22px]">
        {[
          ["DOR", p.pain],
          ["DESEJO", p.desire],
          ["MOTIVO DA COMPRA", p.motive],
        ].map(([k, v]) => (
          <div key={k} className="border-t-2 border-bone pt-2.5 text-sm text-duna">
            <b className="block font-mono font-medium text-[11px] tracking-[0.18em] text-duna mb-1.5">{k}</b>
            {v}
          </div>
        ))}
      </div>
      <div className="flex justify-end mt-8">
        <Link href="/app/sketch/terreno" className="btn btn-solid">
          Ver o terreno ao redor →
        </Link>
      </div>
    </>
  );
}
