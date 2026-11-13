import Link from "next/link";
import { FIELD_LABEL } from "@ground/core";
import { Label, PageHeader, Say } from "@ground/ui";
import { getMzPage } from "@/lib/mzPage";
import { getImport, latestImport } from "@/lib/store";
import { commitImportAction, decideDoubtAction } from "@/app/actions/mz";
import { ImportProgress } from "./ImportProgress";

export const metadata = { title: "Organização dos dados" };

const fmtDate = (d: string) => d.split("-").reverse().slice(1).join("/");

export default async function Organizacao({ searchParams }: { searchParams: Promise<{ importacao?: string }> }) {
  const { ctx } = await getMzPage();
  const { importacao } = await searchParams;
  const imp = importacao ? await getImport(ctx.session.userId, ctx.org.id, importacao) : await latestImport(ctx.session.userId, ctx.org.id);
  if (!imp) {
    return (
      <>
        <PageHeader label="Organização dos dados" title="Nenhuma planilha lida ainda." sub="Suba uma planilha na tela de conexão." />
        <Link href="/app/marco-zero/conexao" className="btn btn-solid">
          Ir para a conexão
        </Link>
      </>
    );
  }
  const pending = imp.doubts.filter((d) => !imp.decisions[d.id]).length;
  const done = imp.status === "concluido";
  return (
    <>
      <PageHeader label="Organização dos dados" title="A gente arruma a casa. Você só confirma o que ficou em dúvida." sub="A leitura reconhece as colunas, junta cadastros repetidos e descarta o que não serve para medir recompra." />
      <ImportProgress orders={imp.stats.ordersRead ?? 0} customers={imp.stats.uniqueCustomers ?? 0} duplicates={(imp.stats.autoMerged ?? 0) + imp.doubts.length} source={imp.filename ?? "Planilha"} />
      {imp.problems.length > 0 && (
        <details className="mt-4 st-hipotese rounded-xl p-4 bg-deep">
          <summary className="cursor-pointer text-sm">{imp.problems.length} linhas não puderam ser lidas</summary>
          <ul className="text-sm text-duna mt-2">
            {imp.problems.slice(0, 10).map((p) => (
              <li key={p.line}>
                Linha {p.line}: {p.reason}
              </li>
            ))}
          </ul>
        </details>
      )}
      <div className="grid lg:grid-cols-2 gap-[18px] mt-[18px]">
        <div>
          <Label>Colunas reconhecidas</Label>
          <div className="overflow-x-auto border border-[var(--rule)] rounded-xl mt-2.5">
            <table className="border-collapse w-full text-sm min-w-[420px]">
              <thead>
                <tr>
                  <th className="lbl font-medium text-left px-3.5 py-2.5 bg-[rgba(242,239,231,.04)]">Na sua planilha</th>
                  <th className="bg-[rgba(242,239,231,.04)]">
                    <span className="sr-only">vira</span>
                  </th>
                  <th className="lbl font-medium text-left px-3.5 py-2.5 bg-[rgba(242,239,231,.04)]">Virou</th>
                </tr>
              </thead>
              <tbody>
                {imp.mapping.map((m) => (
                  <tr key={m.header + m.index}>
                    <td className="px-3.5 py-2.5 border-t border-[var(--rule)]">{m.header}</td>
                    <td className="px-2 py-2.5 border-t border-[var(--rule)] text-duna font-mono" aria-hidden>
                      →
                    </td>
                    <td className="px-3.5 py-2.5 border-t border-[var(--rule)]">
                      <span className={`inline-block font-mono text-[10.5px] tracking-[0.12em] uppercase rounded px-[7px] py-0.5 ${m.target === "ignorado" || m.target === "sensivel" ? "border border-dotted border-sombra text-sombra" : "border border-[var(--rule-strong)]"}`}>{FIELD_LABEL[m.target]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <Label>Ficou em dúvida</Label>
          <div className="mt-2.5 flex flex-col gap-3">
            {imp.doubts.length === 0 && <p className="text-sm text-duna m-0">Nada ficou em dúvida.</p>}
            {imp.doubts.map((d) => {
              const decision = imp.decisions[d.id];
              return (
                <div key={d.id} className={`rounded-[14px] p-5 flex flex-col gap-3.5 bg-deep ${decision ? "st-fato" : "st-hipotese"}`}>
                  {!decision ? (
                    <>
                      <p className="say !text-xl m-0">Esses dois cadastros são a mesma cliente?</p>
                      <div className="grid sm:grid-cols-2 gap-2.5">
                        {[d.a, d.b].map((r, i) => (
                          <div key={i} className="border border-[var(--rule)] rounded-[10px] p-3 text-[13.5px]">
                            <b className="block text-[15px] mb-1">{r.name}</b>
                            <span className="text-duna">
                              {r.orderCount} {r.orderCount === 1 ? "pedido" : "pedidos"} · último em {fmtDate(r.lastDate)}
                            </span>
                            <br />
                            <span className="font-mono text-xs">{r.phoneMasked}</span>
                          </div>
                        ))}
                      </div>
                      <p className="lbl tracking-[0.12em] m-0">{d.reason === "mesmo_telefone" ? "Mesmo telefone, nomes diferentes" : "Mesmo e-mail, telefones diferentes"}</p>
                      {!done && (
                        <form action={decideDoubtAction} className="flex gap-2 flex-wrap">
                          <input type="hidden" name="importId" value={imp.id} />
                          <input type="hidden" name="doubtId" value={d.id} />
                          <button className="btn btn-solid" name="decision" value="juntar" type="submit">
                            Sim, juntar
                          </button>
                          <button className="btn" name="decision" value="separar" type="submit">
                            Não
                          </button>
                        </form>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="say !text-xl m-0">{decision === "juntar" ? `Pronto, virou uma cliente só: ${d.a.orderCount + d.b.orderCount} pedidos.` : "Certo, ficam como duas clientes."}</p>
                      {!done && (
                        <form action={decideDoubtAction}>
                          <input type="hidden" name="importId" value={imp.id} />
                          <input type="hidden" name="doubtId" value={d.id} />
                          <button className="btn" name="decision" value="desfazer" type="submit">
                            Desfazer
                          </button>
                        </form>
                      )}
                    </>
                  )}
                </div>
              );
            })}
            <p className="m-0 text-duna text-sm">
              {(imp.stats.autoMerged ?? 0).toLocaleString("pt-BR")} cadastros repetidos foram unidos sozinhos, porque tinham o mesmo e-mail e o mesmo telefone.
            </p>
            {imp.discarded.length > 0 && <p className="m-0 text-duna text-sm">Descartado na leitura: {imp.discarded.join(", ")}. Nada disso é guardado.</p>}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2.5 mt-8 flex-wrap items-center">
        {done ? (
          <Link href="/app/marco-zero/leitura" className="btn btn-solid">
            Ver o meu marco zero →
          </Link>
        ) : (
          <form action={commitImportAction} className="flex items-center gap-3 flex-wrap">
            <input type="hidden" name="importId" value={imp.id} />
            {pending > 0 && <span className="text-sm text-duna">{pending} em dúvida. Sem resposta, ficam como clientes separadas.</span>}
            <button className="btn btn-solid" type="submit">
              Ver o meu marco zero →
            </button>
          </form>
        )}
      </div>
      <div className="mt-10 pt-5 border-t border-[var(--rule)]">
        <Say>A venda que você procura já está na sua base.</Say>
      </div>
    </>
  );
}
