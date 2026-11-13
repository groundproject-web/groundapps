"use client";
import { useState, type ReactNode } from "react";
import { cx } from "./basics";

export interface ChatMessage {
  id?: string;
  from: "app" | "lojista";
  kind: "texto" | "audio" | "imagem";
  text?: string;
  /** áudio: transcrição (gerada ou digitada) */
  transcript?: string;
  duration?: string;
  images?: { title: string; caption: string; src?: string }[];
  who?: string;
}

function Wave({ n = 26, seed = 5, dark }: { n?: number; seed?: number; dark?: boolean }) {
  return (
    <span className="flex gap-[3px] items-center h-[26px]" aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <i key={i} className={cx("w-[3px] rounded-sm opacity-70", dark ? "bg-carvao" : "bg-bone")} style={{ height: 6 + ((i * seed * 7) % 19) }} />
      ))}
    </span>
  );
}

function Audio({ m, mine }: { m: ChatMessage; mine: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Ouvir áudio${m.duration ? ` de ${m.duration}` : ""} e ver a transcrição`}
          className="w-9 h-9 rounded-full border-0 bg-carvao text-bone cursor-pointer grid place-items-center flex-none"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
            <path d="M3 2l9 5-9 5z" fill="currentColor" />
          </svg>
        </button>
        <Wave dark={mine} />
        <span className={cx("lbl", mine && "!text-carvao")}>{open ? "transcrito" : m.duration}</span>
      </div>
      {open && m.transcript && <p className="mt-2.5 mb-0">“{m.transcript}”</p>}
    </div>
  );
}

/** Conversa com mensagens de texto, áudio e imagem (Sketch e check-in do Marco Zero). */
export function ChatThread({ messages, appName = "Ground", children, composer, live = true }: { messages: ChatMessage[]; appName?: string; children?: ReactNode; composer?: ReactNode; live?: boolean }) {
  return (
    <div className="border border-[var(--rule-strong)] rounded-[18px] p-4 bg-phone flex flex-col gap-3" aria-live={live ? "polite" : undefined}>
      {messages.map((m, i) => {
        const mine = m.from === "lojista";
        return (
          <div
            key={m.id ?? i}
            className={cx(
              "max-w-[88%] px-3.5 py-3 text-[14.5px] leading-normal",
              mine ? "self-end bg-wa text-carvao rounded-[14px_14px_4px_14px]" : "self-start bg-panel rounded-[14px_14px_14px_4px]",
            )}
          >
            {!mine && <span className="lbl block mb-1.5">{m.who ?? appName}</span>}
            {m.kind === "texto" && <span className="whitespace-pre-line">{m.text}</span>}
            {m.kind === "audio" && <Audio m={m} mine={mine} />}
            {m.kind === "imagem" && (
              <div className="flex gap-2.5 flex-wrap">
                {m.images?.map((img, k) =>
                  img.src ? (
                    <img key={k} src={img.src} alt={img.caption} className="w-[120px] h-[150px] object-cover rounded-[10px]" />
                  ) : (
                    <div key={k} className="w-[120px] h-[150px] rounded-[10px] border border-dashed border-carvao flex flex-col justify-end p-2.5 text-[11px] text-carvao" style={{ background: "repeating-linear-gradient(-48deg,rgba(42,39,36,.08) 0 1.5px,transparent 1.5px 8px)" }} role="img" aria-label={`${img.title}: ${img.caption}`}>
                      <b>{img.title}</b>
                      {img.caption}
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        );
      })}
      {children}
      {composer}
    </div>
  );
}

export function ChatAnswers({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2 self-end justify-end">{children}</div>;
}
