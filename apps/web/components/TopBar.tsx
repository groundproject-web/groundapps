import Link from "next/link";
import { terrainLevel } from "@ground/core";
import { logoutAction, switchOrgAction } from "@/app/actions/auth";
import type { OrgContext } from "@/lib/orgs";
import { stagingTools } from "@/lib/env";

/** Barra do topo: troca entre Sketch e Marco Zero (mesma loja, mesmo login), loja, nível do terreno. */
export function TopBar({ ctx, active, builtShare, gamification }: { ctx: OrgContext; active?: "marco_zero" | "sketch" | "inicio"; builtShare?: number | null; gamification?: boolean }) {
  const lvl = builtShare != null ? terrainLevel(builtShare) : null;
  const tab = (key: "inicio" | "sketch" | "marco_zero", href: string, label: string, enabled: boolean) => (
    <Link
      href={enabled ? href : `/app/plano?modulo=${key}`}
      aria-current={active === key ? "page" : undefined}
      className={`btn ${active === key ? "btn-solid" : ""} ${enabled ? "" : "opacity-60"}`}
      title={enabled ? undefined : "Módulo não assinado"}
    >
      {label}
    </Link>
  );
  return (
    <div className="flex flex-wrap gap-3 items-center justify-between py-3.5 px-4 md:px-6 border-b border-[var(--rule)]">
      <nav aria-label="Módulos" className="flex gap-2 flex-wrap">
        {tab("inicio", "/app", "Início", true)}
        {tab("sketch", "/app/sketch", "Sketch", ctx.modules.has("sketch"))}
        {tab("marco_zero", "/app/marco-zero", "Marco Zero", ctx.modules.has("marco_zero"))}
      </nav>
      <div className="flex gap-2.5 items-center flex-wrap">
        {gamification && lvl && (
          <span className="lbl inline-flex items-center gap-2" title="Nível do terreno: vem da % de receita construída">
            <i className={`swatch ${lvl.key === "construido" || lvl.key === "fundacao" ? "swatch-fato" : "swatch-hipotese"}`} aria-hidden />
            {lvl.name}
          </span>
        )}
        {ctx.org.is_demo && stagingTools && <span className="lbl border border-dashed border-[var(--rule-strong)] rounded-full px-2.5 py-1">Demo · relógio {ctx.today.split("-").reverse().join("/")}</span>}
        {ctx.orgs.length > 1 && (
          <form action={switchOrgAction} className="flex gap-1.5">
            <label className="sr-only" htmlFor="org">
              Loja
            </label>
            <select id="org" name="org" defaultValue={ctx.org.id} className="field !py-1.5 !w-auto text-sm">
              {ctx.orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            <button className="btn" type="submit">
              Trocar
            </button>
          </form>
        )}
        <Link href="/app/plano" className="btn">
          Plano
        </Link>
        <form action={logoutAction}>
          <button className="btn" type="submit">
            Sair
          </button>
        </form>
      </div>
    </div>
  );
}
