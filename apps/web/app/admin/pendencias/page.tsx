import { SIGNAL_LABEL } from "@ground/core";
import { Card, PageHeader } from "@ground/ui";
import { getDb } from "@/lib/db";
import { contactStatusAction } from "@/app/actions/admin";

function planText(json: string): string {
  try {
    const p = JSON.parse(json) as { mzTierId: string | null; sketchPlan: string | null };
    return [p.mzTierId ? `Marco Zero ${p.mzTierId}` : null, p.sketchPlan ? `Sketch ${p.sketchPlan}` : null].filter(Boolean).join(" + ") + " · libere na aba Contas";
  } catch {
    return json;
  }
}

const iso = (d: unknown) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10));

export default async function Pendencias() {
  const db = await getDb();
  const { contacts, alerts } = await db.service(async (t) => ({
    contacts: await t.query<{ id: string; org: string; module: string; topic: string; message: string; status: string; created_at: unknown }>("select c.id, o.name as org, c.module, c.topic, c.message, c.status, c.created_at from contact_requests c join organizations o on o.id = c.organization_id order by c.status = 'encerrado', c.created_at desc limit 200"),
    alerts: await t.query<{ org: string; module: string; signal_type: string; weeks: string[]; created_at: unknown }>("select o.name as org, a.module, a.signal_type, a.weeks, a.created_at from structural_alerts a join organizations o on o.id = a.organization_id order by a.created_at desc limit 100"),
  }));
  return (
    <>
      <PageHeader label="Pendências comerciais" title="Gargalos estruturais e pedidos de conversa." sub="Para o Igor acompanhar. A Ground também recebe cada um por e-mail." />
      <h2 className="lbl">Gargalo estrutural (3 semanas seguidas)</h2>
      <div className="grid md:grid-cols-2 gap-3 mt-3 mb-8">
        {alerts.length === 0 && <p className="text-sm text-duna">Nenhum.</p>}
        {alerts.map((a, i) => (
          <Card key={i} status="gargalo" title={`${a.org} · ${SIGNAL_LABEL[a.signal_type] ?? a.signal_type}`}>
            <p className="m-0 text-sm text-duna">
              {a.module} · semanas {a.weeks.join(", ")} · desde {iso(a.created_at)}
            </p>
          </Card>
        ))}
      </div>
      <h2 className="lbl">Converse com a Ground / pedidos de plano</h2>
      <ul className="list-none p-0 mt-3 flex flex-col gap-3">
        {contacts.length === 0 && <li className="text-sm text-duna">Nenhum.</li>}
        {contacts.map((c) => (
          <li key={c.id} className={`rounded-[14px] p-4 bg-deep ${c.status === "encerrado" ? "st-sem_info" : "st-hipotese"}`}>
            <div className="flex justify-between gap-3 flex-wrap">
              <b>
                {c.org} · {c.topic}
              </b>
              <span className="lbl">
                {c.module} · {iso(c.created_at)} · {c.status}
              </span>
            </div>
            {c.message && <p className="text-sm text-duna mb-2 mt-1.5 whitespace-pre-line">{c.module === "billing" ? planText(c.message) : c.message}</p>}
            <form action={contactStatusAction} className="flex gap-2">
              <input type="hidden" name="id" value={c.id} />
              <button className="btn" name="status" value="em_conversa" type="submit">
                Em conversa
              </button>
              <button className="btn" name="status" value="encerrado" type="submit">
                Encerrar
              </button>
            </form>
          </li>
        ))}
      </ul>
    </>
  );
}
