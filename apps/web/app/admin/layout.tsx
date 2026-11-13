import Link from "next/link";
import type { ReactNode } from "react";
import { GroundMark } from "@ground/ui";
import { requireAdmin } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";

export const metadata = { title: "Painel interno" };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap gap-3 items-center justify-between px-4 md:px-6 py-4 border-b border-[var(--rule)] bg-vazio">
        <div className="flex items-center gap-4">
          <GroundMark width={80} />
          <span className="font-display font-extrabold uppercase">Painel interno</span>
        </div>
        <nav aria-label="Painel" className="flex gap-2 flex-wrap">
          <Link className="btn" href="/admin">
            Contas
          </Link>
          <Link className="btn" href="/admin/pendencias">
            Pendências
          </Link>
          <Link className="btn" href="/admin/configuracao">
            Configuração
          </Link>
          <Link className="btn" href="/admin/custo">
            Custo de IA
          </Link>
          <form action={logoutAction}>
            <button className="btn" type="submit">
              Sair
            </button>
          </form>
        </nav>
      </header>
      <main id="conteudo" className="px-4 md:px-6 py-8 max-w-[1200px] mx-auto">
        {children}
      </main>
    </div>
  );
}
