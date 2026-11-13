import { PageHeader } from "@ground/ui";
import { allPricingRules } from "@/lib/pricing";
import { newPricingVersionAction } from "@/app/actions/admin";

export default async function Configuracao({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const all = await allPricingRules();
  const latest = all[all.length - 1];
  return (
    <>
      <PageHeader label="Configuração" title="Regras de preço, versionadas." sub="Todos os valores são HIPÓTESE até a validação. Uma versão nova só vale para cobranças a partir da data de início. Mecânicas de gamificação e freemium ficam desligadas até o aval dos sócios." />
      {sp.erro && (
        <p role="alert" className="st-gargalo rounded-xl p-4 text-sm">
          {sp.erro}
        </p>
      )}
      {sp.salvo && (
        <p role="status" className="st-fato rounded-xl p-4 text-sm">
          Versão {sp.salvo} salva.
        </p>
      )}
      <h2 className="lbl">Versões</h2>
      <ul className="text-sm text-duna mb-6">
        {all.map((r) => (
          <li key={r.version}>
            v{r.version} · vale a partir de {r.effectiveFrom} · gamificação {r.gamificationEnabled ? "ligada" : "desligada"} · freemium {r.freemiumFirstReading ? "ligado" : "desligado"}
          </li>
        ))}
      </ul>
      <form action={newPricingVersionAction} className="flex flex-col gap-3">
        <label htmlFor="rules" className="lbl">
          Nova versão (JSON validado; a versão é numerada sozinha)
        </label>
        <textarea id="rules" name="rules" rows={28} className="field font-mono text-xs" defaultValue={JSON.stringify(latest, null, 2)} />
        <button className="btn btn-solid self-start" type="submit">
          Salvar nova versão
        </button>
      </form>
    </>
  );
}
