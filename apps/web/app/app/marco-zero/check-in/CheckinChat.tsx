"use client";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { ChatAnswers, ChatThread, type ChatMessage } from "@ground/ui";
import { checkinAction } from "@/app/actions/mz";

const REASONS = { tempo: "Faltou tempo", contato: "Não tinha o contato de todas", receio: "Fiquei com receio de incomodar" } as const;
type Status = "todas" | "parte" | "nenhuma";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-solid" disabled={pending}>
      {pending ? "Cruzando com os pedidos da loja…" : label}
    </button>
  );
}

/** Check-in como conversa, não como formulário. Três caminhos: todas, parte, nenhuma. */
export function CheckinChat({ missionId, owner, total, productLabel }: { missionId: string; owner: string; total: number; productLabel: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [count, setCount] = useState<number | "">("");
  const [countDone, setCountDone] = useState(false);
  const [blocker, setBlocker] = useState<keyof typeof REASONS | null>(null);
  const [note, setNote] = useState("");

  const msgs: ChatMessage[] = [{ from: "app", kind: "texto", text: `Oi${owner ? `, ${owner}` : ""}. Faz uma semana que saiu a missão ${productLabel === "da semana" ? "da semana" : `do ${productLabel}`}. Você conseguiu mandar a mensagem para as ${total} clientes?` }];
  if (status) msgs.push({ from: "lojista", kind: "texto", text: status === "todas" ? `Mandei para todas as ${total}.` : status === "parte" ? "Mandei para uma parte." : "Não consegui mandar essa semana." });
  if (status === "parte") msgs.push({ from: "app", kind: "texto", text: "Já é muita coisa. Para quantas?" });
  if (status === "parte" && countDone) msgs.push({ from: "lojista", kind: "texto", text: `Para ${count}.` });
  const needsReason = status === "nenhuma" || (status === "parte" && countDone);
  if (needsReason) msgs.push({ from: "app", kind: "texto", text: status === "parte" ? `O que travou as outras ${total - Number(count || 0)}?` : "Tudo bem, acontece. O que travou?" });
  if (needsReason && blocker) msgs.push({ from: "lojista", kind: "texto", text: `${REASONS[blocker]}.${note ? ` ${note}` : ""}` });
  const askReplies = status === "todas" || (status === "parte" && blocker);
  if (askReplies) msgs.push({ from: "app", kind: "texto", text: "Boa. Se tiver, me manda um print das respostas, ou cola o texto aqui. Eu leio para você." });
  if (status === "nenhuma" && blocker) msgs.push({ from: "app", kind: "texto", text: `Anotado. A próxima missão vai ser menor e mais fácil de encaixar na sua semana. E a oportunidade continua aberta: as ${total} clientes seguem sem recompra.` });

  const reset = () => {
    setStatus(null);
    setCount("");
    setCountDone(false);
    setBlocker(null);
    setNote("");
  };

  return (
    <form action={checkinAction} className="flex flex-col gap-3">
      <input type="hidden" name="missionId" value={missionId} />
      {status && <input type="hidden" name="sendStatus" value={status} />}
      {status === "parte" && <input type="hidden" name="sentCount" value={String(count)} />}
      {blocker && <input type="hidden" name="blocker" value={blocker} />}
      {note && <input type="hidden" name="blockerNote" value={note} />}
      <ChatThread messages={msgs} appName="Marco Zero">
        {!status && (
          <ChatAnswers>
            <button type="button" className="btn btn-solid" onClick={() => setStatus("todas")}>
              Mandei para todas
            </button>
            <button type="button" className="btn" onClick={() => setStatus("parte")}>
              Mandei para uma parte
            </button>
            <button type="button" className="btn" onClick={() => setStatus("nenhuma")}>
              Não consegui
            </button>
          </ChatAnswers>
        )}
        {status === "parte" && !countDone && (
          <div className="flex gap-2 self-end items-center">
            <label htmlFor="qtd" className="sr-only">
              Para quantas clientes
            </label>
            <input id="qtd" type="number" min={1} max={total - 1} value={count} onChange={(e) => setCount(e.target.value ? Number(e.target.value) : "")} className="field !w-28" />
            <button type="button" className="btn btn-solid" disabled={!count || Number(count) < 1 || Number(count) >= total} onClick={() => setCountDone(true)}>
              Responder
            </button>
          </div>
        )}
        {needsReason && !blocker && (
          <div className="flex flex-col gap-2 self-end items-end w-full">
            <ChatAnswers>
              {(Object.keys(REASONS) as (keyof typeof REASONS)[]).map((k) => (
                <button key={k} type="button" className="btn" onClick={() => setBlocker(k)}>
                  {REASONS[k]}
                </button>
              ))}
            </ChatAnswers>
            <label className="sr-only" htmlFor="nota">
              Outro motivo
            </label>
            <input id="nota" placeholder="Outro motivo (opcional)" value={note} onChange={(e) => setNote(e.target.value)} className="field !w-full sm:!w-80" />
          </div>
        )}
        {askReplies && (
          <div className="self-end w-full max-w-[88%] flex flex-col gap-2">
            <label htmlFor="replies" className="lbl">
              Respostas das clientes (uma por linha)
            </label>
            <textarea id="replies" name="replies" rows={4} className="field" placeholder={"Pode mandar o link!\nO frete tá caro…"} />
            <label htmlFor="prints" className="lbl">
              Prints (opcional, até 8)
            </label>
            <input id="prints" name="prints" type="file" accept="image/png,image/jpeg,image/webp" multiple className="text-sm" />
            <p className="text-xs text-duna m-0">Os prints não são guardados: a gente lê, guarda só o resumo, sem nome de cliente. Áudio: por enquanto, escreva o que elas disseram.</p>
          </div>
        )}
        <div className="flex items-center gap-2 border border-[var(--rule)] rounded-full py-1.5 pr-1.5 pl-4 text-sombra text-[13.5px]" aria-hidden>
          <span className="flex-1">Escreva, mande um áudio ou um print…</span>
        </div>
      </ChatThread>
      <div className="flex justify-between gap-2 flex-wrap">
        {status && (
          <button type="button" className="btn" onClick={reset}>
            Responder de outro jeito
          </button>
        )}
        {(askReplies || (status === "nenhuma" && blocker)) && <Submit label="Ver o resultado →" />}
      </div>
    </form>
  );
}
