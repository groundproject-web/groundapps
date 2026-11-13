import { PageHeader } from "@ground/ui";
import { getDb } from "@/lib/db";

export default async function Custo() {
  const db = await getDb();
  const rows = await db.service((t) =>
    t.query<{ org: string | null; feature: string; calls: number; offline: number; input: number; output: number; micros: number }>(
      `select o.name as org, u.feature, count(*)::int as calls, sum(case when u.offline then 1 else 0 end)::int as offline,
        coalesce(sum(u.input_tokens),0)::int as input, coalesce(sum(u.output_tokens),0)::int as output, coalesce(sum(u.cost_usd_micros),0)::bigint as micros
       from ai_usage u left join organizations o on o.id = u.organization_id
       where u.created_at > now() - interval '30 days'
       group by o.name, u.feature order by micros desc`,
    ),
  );
  const total = rows.reduce((s, r) => s + Number(r.micros), 0);
  return (
    <>
      <PageHeader label="Custo de IA" title={`US$ ${(total / 1e6).toFixed(2)} nos últimos 30 dias`} sub="Por conta e por função. Chamadas offline (modo demo, sem chave) custam zero." />
      <div className="overflow-x-auto border border-[var(--rule)] rounded-[14px]">
        <table className="w-full border-collapse text-sm min-w-[640px]">
          <thead>
            <tr>
              {["Conta", "Função", "Chamadas", "Offline", "Tokens (entrada / saída)", "Custo"].map((h) => (
                <th key={h} className="lbl font-medium text-left px-3 py-2.5 bg-[rgba(242,239,231,.04)]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-[var(--rule)]">
                <td className="px-3 py-2.5">{r.org ?? "—"}</td>
                <td className="px-3 py-2.5">{r.feature}</td>
                <td className="px-3 py-2.5 num">{r.calls}</td>
                <td className="px-3 py-2.5 num">{r.offline}</td>
                <td className="px-3 py-2.5 num">
                  {Number(r.input).toLocaleString("pt-BR")} / {Number(r.output).toLocaleString("pt-BR")}
                </td>
                <td className="px-3 py-2.5 num">US$ {(Number(r.micros) / 1e6).toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
