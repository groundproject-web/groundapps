import { formatBRL, tierForBase, upgradeHeadline, type PriceQuote, type SketchPlan, type UpgradeState } from "@ground/core";
import { Card, Label, PageHeader } from "@ground/ui";
import { getOrgContext } from "@/lib/orgs";
import { TopBar } from "@/components/TopBar";
import { currentRules } from "@/lib/pricing";
import { getDb } from "@/lib/db";
import { acceptUpgradeAction, cancelAction } from "@/app/actions/billing";
import { TerrainCalculator } from "./TerrainCalculator";

export const metadata = { title: "Plano" };

export default async function Plano({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await getOrgContext();
  const sp = await searchParams;
  const rules = await currentRules(ctx.today);
  const db = await getDb();
  const { sub, st, customers } = await db.asUser(ctx.session.userId, async (t) => ({
    sub: (await t.query<{ provider: string; status: string; quote: PriceQuote }>("select provider, status, quote from billing_subscriptions where organization_id = $1", [ctx.org.id]))[0],
    st: (await t.query<{ billed_tier: string | null; tier_state: UpgradeState }>("select billed_tier, tier_state from mz_settings where organization_id = $1", [ctx.org.id]).catch(() => []))[0],
    customers: Number((await t.query<{ n: number }>("select count(*)::int as n from customers where organization_id = $1", [ctx.org.id]))[0].n),
  }));
  const baseTier = customers ? tierForBase(customers, rules).id : null;
  const mzEnt = ctx.entitlements.find((e) => e.module === "marco_zero" && e.status !== "cancelado");
  const skEnt = ctx.entitlements.find((e) => e.module === "sketch" && e.status !== "cancelado");
  const state = st?.tier_state;
  const toTier = state && (state.kind === "aviso" || state.kind === "carencia_vencida") ? rules.mzTiers.find((t) => t.id === state.toTier) : null;
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar ctx={ctx} />
      <main id="conteudo" className="py-9 px-4 md:px-6 max-w-[1120px] w-full mx-auto flex flex-col gap-7">
        <PageHeader label="Plano" title="Cada app vive sozinho. Juntos, custam menos." sub="O Marco Zero cobra pelo tamanho da base. O Sketch, pela profundidade do acompanhamento. Juntos, 20% de desconto numa assinatura só." />
        {sp.pedido && <p className="st-fato rounded-xl p-4 bg-deep m-0 text-sm" role="status">Pedido enviado. A Ground libera o plano e te avisa por e-mail. Nada é cobrado sem o seu aceite.</p>}
        {sp.upgrade && <p className="st-fato rounded-xl p-4 bg-deep m-0 text-sm" role="status">Faixa atualizada.</p>}
        {sp.cancelado && <p className="st-hipotese rounded-xl p-4 bg-deep m-0 text-sm" role="status">Cancelado. O histórico fica guardado e volta se você assinar de novo. Para apagar tudo, use “Seus dados”.</p>}

        {toTier && state && state.kind !== "ok" && state.kind !== "sugerir_downgrade" && (
          <Card status="fato" title={upgradeHeadline(customers, rules, state.fromTier)} tag="Conquista">
            <p className="m-0 text-sm text-duna">
              Faixa nova: {toTier.label} · {formatBRL(toTier.priceCents)}/mês{toTier.ecomBridge ? " · com ponte direta para o Método ECOM" : ""}.{" "}
              {state.kind === "aviso" ? `Até ${state.graceEndsAt.split("-").reverse().join("/")}, nada muda no preço.` : `A carência acabou. A leitura continua; as missões cobrem só as primeiras ${state.capCustomers.toLocaleString("pt-BR")} clientes até você aceitar.`}
            </p>
            <p className="m-0 text-sm">O upgrade só acontece com o seu clique.</p>
            <form action={acceptUpgradeAction}>
              <button className="btn btn-solid" type="submit">
                Aceitar a faixa nova
              </button>
            </form>
          </Card>
        )}
        {state?.kind === "sugerir_downgrade" && (
          <Card status="hipotese" title="Sua base ficou menor">
            <p className="m-0 text-sm text-duna">A faixa {state.toTier} cabe na sua base agora. Peça a troca abaixo; vale a partir do próximo ciclo.</p>
          </Card>
        )}

        <section aria-labelledby="atual">
          <Label as="h2">
            <span id="atual">Seu plano hoje</span>
          </Label>
          <div className="grid md:grid-cols-2 gap-3.5 mt-3">
            <Card status={mzEnt ? "fato" : "sem_info"} title="Marco Zero">
              <p className="m-0 text-sm text-duna">{mzEnt ? `Faixa ${st?.billed_tier ?? mzEnt.plan}${customers ? ` · ${customers.toLocaleString("pt-BR")} clientes na base` : ""}` : "Não assinado."}</p>
              {mzEnt && (
                <form action={cancelAction}>
                  <input type="hidden" name="module" value="marco_zero" />
                  <button className="btn" type="submit">
                    Cancelar o Marco Zero
                  </button>
                </form>
              )}
            </Card>
            <Card status={skEnt ? "fato" : "sem_info"} title="Sketch">
              <p className="m-0 text-sm text-duna">{skEnt ? `Plano ${skEnt.plan === "completo" ? "Completo" : "Início"}` : "Não assinado."}</p>
              {skEnt && (
                <form action={cancelAction}>
                  <input type="hidden" name="module" value="sketch" />
                  <button className="btn" type="submit">
                    Cancelar o Sketch
                  </button>
                </form>
              )}
            </Card>
          </div>
          {sub && (
            <p className="text-sm text-duna mt-3">
              Assinatura {sub.status} · cobrança {sub.provider === "manual" ? "liberada pela Ground (manual)" : sub.provider} · {formatBRL(sub.quote.totalCents ?? 0, { decimals: (sub.quote.totalCents ?? 0) % 100 !== 0 })}/mês
            </p>
          )}
        </section>

        <TerrainCalculator rules={rules} baseTier={baseTier} initialMz={mzEnt ? (st?.billed_tier ?? mzEnt.plan) : sp.modulo === "marco_zero" ? baseTier : null} initialSketch={(skEnt?.plan as SketchPlan) ?? (sp.modulo === "sketch" ? "inicio" : null)} />

        {rules.gamificationEnabled && (
          <Card status="hipotese" title="Constância">
            <p className="m-0 text-sm text-duna">
              No combo, cada {rules.streak.every} check-ins seguidos somam +{rules.streak.bonusPct}% de desconto no mês seguinte, até {rules.streak.maxTotalDiscountPct}% no total. Perder a sequência zera o bônus, não o desconto base.
            </p>
          </Card>
        )}
      </main>
    </div>
  );
}
