import { tierForBase } from "@ground/core";
import { PageHeader } from "@ground/ui";
import { getDb } from "@/lib/db";
import { currentRules } from "@/lib/pricing";
import { orgSettingsAction, releasePlanAction } from "@/app/actions/admin";

const iso = (d: unknown) => (d instanceof Date ? d.toISOString().slice(0, 10) : d ? String(d).slice(0, 10) : "—");

export default async function Contas() {
  const db = await getDb();
  const rules = await currentRules(new Date().toISOString().slice(0, 10));
  const rows = await db.service((t) =>
    t.query<{ id: string; name: string; is_demo: boolean; deletion_requested_at: unknown; customers: number; missions: number; checkins: number; last_activity: unknown; mz: string | null; sk: string | null; billed_tier: string | null; win_days: number | null; control: number | null }>(`
      select o.id, o.name, o.is_demo, o.deletion_requested_at,
        (select count(*)::int from customers c where c.organization_id = o.id) as customers,
        (select count(*)::int from mz_missions m where m.organization_id = o.id and (m.status = 'fechada' or m.week_start + 7 <= coalesce(o.clock_date, current_date))) as missions,
        (select count(*)::int from mz_checkins c where c.organization_id = o.id) as checkins,
        greatest((select max(created_at) from mz_checkins c where c.organization_id = o.id), (select max(created_at) from sketch_checkins c where c.organization_id = o.id), (select max(created_at) from imports i where i.organization_id = o.id)) as last_activity,
        (select plan from entitlements e where e.organization_id = o.id and e.module = 'marco_zero' and e.status <> 'cancelado') as mz,
        (select plan from entitlements e where e.organization_id = o.id and e.module = 'sketch' and e.status <> 'cancelado') as sk,
        s.billed_tier, s.attribution_window_days as win_days, s.control_group_pct as control
      from organizations o left join mz_settings s on s.organization_id = o.id
      order by o.created_at desc`),
  );
  return (
    <>
      <PageHeader label="Contas" title="Quem está usando, e se está respondendo." sub="Métrica de saúde nº 1: check-in respondido. A meta da validação é 4 semanas seguidas." />
      <div className="overflow-x-auto border border-[var(--rule)] rounded-[14px]">
        <table className="w-full border-collapse text-sm min-w-[980px]">
          <thead>
            <tr>
              {["Conta", "Plano", "Faixa (base)", "Última atividade", "Check-in respondido", "Liberar plano", "Atribuição"].map((h) => (
                <th key={h} className="lbl font-medium text-left px-3 py-2.5 bg-[rgba(242,239,231,.04)]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const rate = r.missions ? r.checkins / r.missions : null;
              return (
                <tr key={r.id} className="border-t border-[var(--rule)] align-top">
                  <td className="px-3 py-3">
                    <b>{r.name}</b>
                    {r.is_demo && <span className="lbl ml-2">demo</span>}
                    {r.deletion_requested_at ? <span className="block text-xs">Exclusão pedida em {iso(r.deletion_requested_at)}</span> : null}
                  </td>
                  <td className="px-3 py-3">
                    {r.mz ? `MZ ${r.billed_tier ?? r.mz}` : "—"}
                    <br />
                    {r.sk ? `Sketch ${r.sk}` : ""}
                  </td>
                  <td className="px-3 py-3">
                    {r.customers.toLocaleString("pt-BR")} clientes
                    <br />
                    <span className="text-duna">{r.customers ? tierForBase(r.customers, rules).id : "—"}</span>
                  </td>
                  <td className="px-3 py-3">{iso(r.last_activity)}</td>
                  <td className="px-3 py-3">{rate === null ? "—" : `${Math.round(rate * 100)}% (${r.checkins}/${r.missions})`}</td>
                  <td className="px-3 py-3">
                    <form action={releasePlanAction} className="flex flex-col gap-1.5">
                      <input type="hidden" name="orgId" value={r.id} />
                      <select name="mz" defaultValue={r.mz ? (r.billed_tier ?? r.mz) : ""} className="field !py-1" aria-label={`Faixa do Marco Zero de ${r.name}`}>
                        <option value="">Sem Marco Zero</option>
                        {rules.mzTiers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.id} · {t.label}
                          </option>
                        ))}
                      </select>
                      <select name="sk" defaultValue={r.sk ?? ""} className="field !py-1" aria-label={`Plano do Sketch de ${r.name}`}>
                        <option value="">Sem Sketch</option>
                        <option value="inicio">Sketch Início</option>
                        <option value="completo">Sketch Completo</option>
                      </select>
                      <button className="btn" type="submit">
                        Liberar
                      </button>
                    </form>
                  </td>
                  <td className="px-3 py-3">
                    <form action={orgSettingsAction} className="flex flex-col gap-1.5">
                      <input type="hidden" name="orgId" value={r.id} />
                      <label className="text-xs text-duna">
                        Janela (dias)
                        <input name="window" type="number" min={1} max={30} defaultValue={r.win_days ?? rules.attributionWindowDays} className="field !py-1" />
                      </label>
                      <label className="text-xs text-duna">
                        Comparação (%)
                        <input name="control" type="number" min={0} max={50} defaultValue={r.control ?? rules.controlGroupPct} className="field !py-1" />
                      </label>
                      <button className="btn" type="submit">
                        Salvar
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
