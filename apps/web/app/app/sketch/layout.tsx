import type { ReactNode } from "react";
import { Rail } from "@/components/Rail";
import { TopBar } from "@/components/TopBar";
import { getSkPage } from "@/lib/skPage";

const STEPS = [
  { href: "/app/sketch/entrada", label: "Entrada" },
  { href: "/app/sketch/cliente", label: "Quem é a cliente" },
  { href: "/app/sketch/terreno", label: "O terreno ao redor" },
  { href: "/app/sketch/canais", label: "Onde ela está" },
  { href: "/app/sketch/plano", label: "Plano e missões" },
  { href: "/app/sketch/check-in", label: "Check-in da semana", sep: "Durante o mês" },
  { href: "/app/sketch/sinais", label: "Primeiros sinais e ajuste" },
  { href: "/app/sketch/codigos", label: "Códigos de origem" },
];

export default async function SkLayout({ children }: { children: ReactNode }) {
  const { ctx, data, rules } = await getSkPage();
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] md:grid-cols-[272px_minmax(0,1fr)] min-h-screen">
      <Rail
        product="Sketch"
        store={{ initial: ctx.org.name[0], name: `${ctx.org.owner_display_name ? ctx.org.owner_display_name + " · " : ""}${ctx.org.name}`, what: data?.segment || ctx.org.segment || "Loja" }}
        steps={STEPS}
        linked={
          <span className="flex gap-2 items-center text-[12.5px] text-duna">
            <i className={`swatch ${ctx.integrated ? "swatch-fato" : "swatch-sem_info"}`} aria-hidden />
            {ctx.integrated ? "Ligado ao Marco Zero" : "Sem Marco Zero · Sketch sozinho"}
          </span>
        }
        foot={
          <>
            {ctx.org.is_demo && <span className="lbl self-start border border-dashed border-[var(--rule-strong)] rounded-full px-2.5 py-1">Demonstração · dados fictícios</span>}
            <span className="lbl tracking-[0.14em]">Aquisição construída, não alugada</span>
          </>
        }
      />
      <main className="min-w-0 flex flex-col">
        <TopBar ctx={ctx} active="sketch" gamification={rules.gamificationEnabled && ctx.integrated} />
        <div id="conteudo" className="py-9 px-4 md:px-6 max-w-[1120px] w-full flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
