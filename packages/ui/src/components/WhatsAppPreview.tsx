"use client";
import { useId, useState } from "react";

/** Bolha de WhatsApp editável com botão Copiar. O app NÃO envia: o lojista copia e manda. */
export function WhatsAppPreview({
  storeName,
  initial,
  onChange,
  hint = "Editável · [nome] vira o nome de cada cliente",
  readOnly,
}: {
  storeName: string;
  initial: string;
  onChange?: (v: string) => void;
  hint?: string;
  readOnly?: boolean;
}) {
  const [text, setText] = useState(initial);
  const [status, setStatus] = useState("");
  const id = useId();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Mensagem copiada");
    } catch {
      (document.getElementById(id) as HTMLTextAreaElement | null)?.select();
      setStatus("Selecionada: copie com Ctrl+C");
    }
    setTimeout(() => setStatus(""), 2200);
  };
  return (
    <div className="border border-[var(--rule-strong)] rounded-[22px] p-3.5 bg-phone flex flex-col gap-3">
      <div className="flex items-center gap-2.5 px-1.5 pb-2.5 border-b border-[var(--rule)]">
        <div className="w-[34px] h-[34px] rounded-full bg-panel grid place-items-center font-display font-semibold text-sm border border-[var(--rule-strong)]" aria-hidden>
          {storeName[0]}
        </div>
        <div>
          <b className="text-sm">{storeName}</b>
          <div className="lbl tracking-[0.1em]">Prévia · WhatsApp</div>
        </div>
      </div>
      <div className="self-end w-full max-w-[92%] bg-wa text-carvao rounded-[14px_14px_4px_14px] p-1">
        <label htmlFor={id} className="sr-only">
          Mensagem editável
        </label>
        <textarea
          id={id}
          value={text}
          readOnly={readOnly}
          onChange={(e) => {
            setText(e.target.value);
            onChange?.(e.target.value);
          }}
          className="block w-full min-h-[190px] border-0 bg-transparent text-carvao resize-y px-3 py-2.5 text-[14.5px] leading-normal focus:outline-2 focus:outline-carvao rounded-[10px]"
        />
      </div>
      <div className="font-mono text-[10.5px] text-duna text-right tracking-[0.1em]">{hint}</div>
      <button type="button" className="btn btn-solid" onClick={copy}>
        Copiar mensagem
      </button>
      <p role="status" aria-live="polite" className="lbl m-0 min-h-4 text-center">
        {status}
      </p>
    </div>
  );
}
