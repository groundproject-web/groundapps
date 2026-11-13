import { PageHeader, Say } from "@ground/ui";
import { getOrgContext } from "@/lib/orgs";
import { TopBar } from "@/components/TopBar";
import { contactGroundAction } from "@/app/actions/mz";
import { SIGNAL_LABEL } from "@ground/core";

export const metadata = { title: "Converse com a Ground" };

export default async function Conversar({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await getOrgContext();
  const sp = await searchParams;
  const topic = sp.assunto ? (SIGNAL_LABEL[sp.assunto] ?? sp.assunto) : "";
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar ctx={ctx} />
      <main id="conteudo" className="py-9 px-4 md:px-6 max-w-[720px] w-full mx-auto flex flex-col gap-6">
        <PageHeader label="Converse com a Ground" title="Quando o problema é de estrutura, vale uma conversa." sub="O app mostra onde olhar. O porquê (marca, produto, operação, comunidade) a gente conversa com calma." />
        {sp.enviado ? (
          <p className="st-fato rounded-xl p-4 bg-deep m-0" role="status">
            Recebido. Alguém da Ground te chama em breve.
          </p>
        ) : (
          <form action={contactGroundAction} className="flex flex-col gap-4">
            <input type="hidden" name="module" value={sp.modulo ?? "geral"} />
            <label className="flex flex-col gap-1.5">
              <span className="lbl">Assunto</span>
              <input name="topic" defaultValue={topic} required className="field" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="lbl">Conta em poucas palavras</span>
              <textarea name="message" rows={5} className="field" />
            </label>
            <button type="submit" className="btn btn-solid self-start">
              Enviar
            </button>
          </form>
        )}
        <Say>Paid attention → owned ground.</Say>
      </main>
    </div>
  );
}
