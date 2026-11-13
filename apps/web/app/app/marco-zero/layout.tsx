import type { ReactNode } from "react";
import { Rail } from "@/components/Rail";
import { TopBar } from "@/components/TopBar";
import { getMzPage } from "@/lib/mzPage";

const STEPS = [
  { href: "/app/marco-zero/conexao", label: "Conexão" },
  { href: "/app/marco-zero/organizacao", label: "Organização dos dados" },
  { href: "/app/marco-zero/leitura", label: "Seu marco zero" },
  { href: "/app/marco-zero/dinheiro-parado", label: "Dinheiro parado" },
  { href: "/app/marco-zero/grupos", label: "Grupos de clientes" },
  { href: "/app/marco-zero/missao", label: "Missão da semana" },
  { href: "/app/marco-zero/check-in", label: "Check-in da missão", sep: "Uma semana depois" },
  { href: "/app/marco-zero/resultado", label: "Resultado" },
  { href: "/app/marco-zero/ajuste", label: "Ajuste da próxima semana" },
  { href: "/app/marco-zero/evolucao", label: "O que a loja já sabe" },
];

export default async function MzLayout({ children }: { children: ReactNode }) {
  const { ctx, ov, settings } = await getMzPage();
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] md:grid-cols-[272px_minmax(0,1fr)] min-h-screen">
      <Rail
        product="Marco Zero"
        store={{ initial: ctx.org.name[0], name: `${ctx.org.owner_display_name ? ctx.org.owner_display_name + " · " : ""}${ctx.org.name}`, what: ctx.org.segment || "Loja" }}
        steps={STEPS}
        foot={
          <>
            {ctx.org.is_demo && <span className="lbl self-start border border-dashed border-[var(--rule-strong)] rounded-full px-2.5 py-1">Demonstração · dados fictícios</span>}
            <span className="lbl tracking-[0.14em]">Paid attention → owned ground</span>
          </>
        }
      />
      <main className="min-w-0 flex flex-col">
        <TopBar ctx={ctx} active="marco_zero" builtShare={ov?.baseline.recentBuiltShare ?? null} gamification={settings.rules.gamificationEnabled} />
        <div id="conteudo" className="py-9 px-4 md:px-6 max-w-[1120px] w-full flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
