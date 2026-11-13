import Link from "next/link";
import { Card, ChatThread, GroundMark, Label, PageHeader, type ChatMessage } from "@ground/ui";
import { getSkPage } from "@/lib/skPage";
import { sendSketchMessageAction } from "@/app/actions/sketch";

export const metadata = { title: "Sketch · Entrada" };

const QUESTIONS = ["Me conta da sua marca do jeito que você contaria para um cliente.", "O que a sua marca tem que as outras não têm?", "Onde você já vende hoje?", "Quais concorrentes você conhece?"];

export default async function Entrada() {
  const { data, sk, ctx } = await getSkPage();
  const msgs: ChatMessage[] = sk.messages.length ? (sk.messages as ChatMessage[]) : [{ from: "app", kind: "texto", text: `${QUESTIONS[0]} Pode mandar áudio e print.` }];
  const imported = ctx.integrated ? data?.importedFromMz : undefined;
  return (
    <>
      <PageHeader
        label={data?.intro.label ?? (ctx.integrated ? "Ground Sketch · com o Marco Zero" : "Ground Sketch · sozinho")}
        title={data?.intro.title ?? (ctx.integrated ? "A aquisição começa por quem já volta." : "Sem base de clientes? A gente começa pela conversa.")}
        sub={data?.intro.subtitle ?? "O Sketch parte do que você sabe e do que o seu público já escreve."}
      />
      <div className="grid lg:grid-cols-2 gap-[18px] items-start">
        <div className="flex flex-col gap-3">
          <ChatThread messages={msgs} appName="Sketch" />
          <form action={sendSketchMessageAction} className="flex flex-col gap-2 border border-[var(--rule)] rounded-[14px] p-3.5 bg-deep">
            <label htmlFor="text" className="lbl">
              Sua resposta
            </label>
            <textarea id="text" name="text" rows={3} className="field" placeholder={QUESTIONS[Math.min(QUESTIONS.length - 1, Math.floor(sk.messages.filter((m) => m.from === "lojista").length))]} />
            <div className="grid sm:grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-xs text-duna">
                Áudio (opcional)
                <input name="audio" type="file" accept="audio/*" className="text-sm" />
              </label>
              <label className="flex flex-col gap-1 text-xs text-duna">
                Prints (opcional)
                <input name="images" type="file" accept="image/*" multiple className="text-sm" />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-xs text-duna">
              O que você disse no áudio (enquanto a transcrição automática não chega)
              <input name="transcript" className="field" />
            </label>
            <button type="submit" className="btn btn-solid self-end">
              Enviar
            </button>
          </form>
        </div>
        {imported ? (
          <div className="flex gap-4 items-center st-fato rounded-[14px] p-[18px] bg-deep">
            <GroundMark width={70} label={null} />
            <div>
              <Label>Importado do Marco Zero</Label>
              <b className="block font-display font-extrabold text-[40px] leading-none num">{imported.total}</b>
              <span className="text-sm text-duna">
                clientes que já compraram mais de uma vez: {imported.loyal} fiéis e {imported.atRisk} em risco
              </span>
            </div>
          </div>
        ) : (
          <Card status="sem_info" title="Base de clientes" tag="Sem informação ainda">
            <p className="m-0 text-sm text-duna">{data?.baseCard.status === "sem_info" ? data.baseCard.text : "Sem loja conectada e sem planilha. Tudo bem: o Sketch funciona sozinho. Quando a base existir, ela entra no plano."}</p>
            {!ctx.modules.has("marco_zero") && ctx.modules.has("sketch") && data?.path === 2 && <p className="m-0 text-sm">Os dados do Marco Zero ficam guardados, mas só aparecem com as duas assinaturas ativas.</p>}
          </Card>
        )}
      </div>
      <div className="flex justify-end mt-8">
        <Link href="/app/sketch/cliente" className="btn btn-solid">
          Ver quem é a cliente →
        </Link>
      </div>
    </>
  );
}
