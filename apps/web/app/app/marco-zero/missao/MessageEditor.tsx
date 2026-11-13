"use client";
import { useRef } from "react";
import { WhatsAppPreview } from "@ground/ui";
import { saveMessageAction } from "@/app/actions/mz";

/** Mensagem editável: salva a versão do lojista (sem enviar nada). */
export function MessageEditor({ missionId, storeName, initial, persist }: { missionId: string; storeName: string; initial: string; persist: boolean }) {
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  return (
    <WhatsAppPreview
      storeName={storeName}
      initial={initial}
      onChange={(v) => {
        if (!persist) return;
        if (t.current) clearTimeout(t.current);
        t.current = setTimeout(() => void saveMessageAction(missionId, v), 800);
      }}
    />
  );
}
