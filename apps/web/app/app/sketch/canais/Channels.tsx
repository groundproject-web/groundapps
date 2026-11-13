"use client";
import { useOptimistic, useTransition } from "react";
import type { Channel } from "@ground/core";
import { ChannelCard } from "@ground/ui";
import { toggleChannelAction } from "@/app/actions/sketch";

export function Channels({ channels, notes }: { channels: Channel[]; notes: Record<string, { note: string; priority: number; status: Channel["status"] }> }) {
  const [list, toggle] = useOptimistic(channels, (cur, key: string) => cur.map((c) => (c.key === key ? { ...c, inPlan: !c.inPlan } : c)));
  const [, start] = useTransition();
  const inPlan = list.filter((c) => c.inPlan).length;
  return (
    <>
      <p className="lbl m-0 mb-3" aria-live="polite">
        {inPlan} de {list.length} canais no plano
      </p>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3.5">
        {list.map((c) => (
          <ChannelCard
            key={c.key}
            title={c.title}
            detail={c.detail}
            priority={notes[c.key]?.priority ?? c.priority}
            status={notes[c.key]?.status ?? c.status}
            note={notes[c.key]?.note}
            inPlan={c.inPlan}
            onToggle={() =>
              start(async () => {
                toggle(c.key);
                await toggleChannelAction(c.key);
              })
            }
          />
        ))}
      </div>
    </>
  );
}
