"use client";
import { useOptimistic, useTransition } from "react";
import type { SketchMission } from "@ground/core";
import { CheckMission } from "@ground/ui";
import { toggleMissionAction } from "@/app/actions/sketch";

const KIND: Record<string, string> = { roteiro_conversa: "Roteiro de conversa", carrossel: "Texto do carrossel", roteiro_video: "Roteiro de vídeo", cartao: "Texto do cartão" };

export function Missions({ missions, codes }: { missions: SketchMission[]; codes: Record<string, string> }) {
  const [list, toggle] = useOptimistic(missions, (cur, key: string) => cur.map((m) => (m.key === key ? { ...m, done: !m.done } : m)));
  const [, start] = useTransition();
  const done = list.filter((m) => m.done).length;
  return (
    <>
      <p className="sub m-0 mb-5">
        Você sai com o plano e já dá os primeiros passos. Marque o que for fazendo:{" "}
        <b className="text-bone" aria-live="polite">
          {done} de {list.length} feitas
        </b>
        .
      </p>
      <div className="flex flex-col gap-2.5">
        {list.map((m) => (
          <CheckMission key={m.key} title={m.title} detail={m.detail} category={m.category} done={m.done} onToggle={() => start(async () => (toggle(m.key), await toggleMissionAction(m.key)))}>
            {(m.material || codes[m.key]) && (
              <details className="text-sm">
                <summary className="cursor-pointer text-duna">Material pronto e código de origem</summary>
                {m.material && (
                  <div className="mt-2">
                    <span className="lbl">{KIND[m.material.kind]}</span>
                    <p className="whitespace-pre-line bg-wa text-carvao rounded-xl px-3.5 py-3 mt-1.5 mb-0">{m.material.text}</p>
                  </div>
                )}
                {codes[m.key] && (
                  <p className="mt-2 mb-0">
                    <span className="lbl">Código de origem</span> <code className="font-mono">{codes[m.key]}</code>
                  </p>
                )}
              </details>
            )}
          </CheckMission>
        ))}
      </div>
    </>
  );
}
