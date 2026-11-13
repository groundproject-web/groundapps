import Link from "next/link";
import { Label, PageHeader, Say } from "@ground/ui";
import { getMzPage } from "@/lib/mzPage";
import { uploadSheetAction, useDemoSheetAction } from "@/app/actions/mz";
import { stagingTools } from "@/lib/env";

const icon = {
  store: (
    <svg viewBox="0 0 40 40" fill="none" stroke="#F2EFE7" strokeWidth="1.6" strokeLinecap="round" aria-hidden className="w-10 h-10">
      <path d="M6 15 9 7h22l3 8" />
      <path d="M6 15c0 3 2.5 4.5 4.7 4.5S15.3 18 15.3 15c0 3 2.2 4.5 4.7 4.5s4.7-1.5 4.7-4.5c0 3 2.2 4.5 4.6 4.5S34 18 34 15" />
      <path d="M9 20v13h22V20" />
      <path d="M17 33v-7h6v7" />
    </svg>
  ),
  bag: (
    <svg viewBox="0 0 40 40" fill="none" stroke="#F2EFE7" strokeWidth="1.6" strokeLinecap="round" aria-hidden className="w-10 h-10">
      <path d="M8 13h24l-2 21H10z" />
      <path d="M15 16v-5a5 5 0 0 1 10 0v5" />
    </svg>
  ),
  sheet: (
    <svg viewBox="0 0 40 40" fill="none" stroke="#F2EFE7" strokeWidth="1.6" strokeLinecap="round" aria-hidden className="w-10 h-10">
      <path d="M10 5h14l7 7v23H10z" />
      <path d="M24 5v7h7" />
      <path d="M14 19h13M14 24h13M14 29h13M19 17v14" />
    </svg>
  ),
};

export default async function Conexao({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { ctx, hasData, ds } = await getMzPage();
  const { erro } = await searchParams;
  return (
    <>
      <PageHeader
        label={`Bem-vinda${ctx.org.owner_display_name ? `, ${ctx.org.owner_display_name}` : ""}`}
        title="Vamos ler a sua base de clientes."
        sub="Conecte a sua loja ou suba uma planilha, mesmo bagunçada. Em poucos minutos você vê quanto da sua receita é alugada e quanto dinheiro está parado na sua base."
      />
      {hasData && (
        <p className="st-fato rounded-xl p-4 bg-deep m-0 mb-5 text-sm">
          Sua base já está lida: {ds.customers.length.toLocaleString("pt-BR")} clientes e {ds.orders.length.toLocaleString("pt-BR")} pedidos.{" "}
          <Link href="/app/marco-zero/leitura" className="underline underline-offset-4">
            Ver o seu marco zero
          </Link>
          . Subir uma planilha nova substitui a base.
        </p>
      )}
      {erro && (
        <p role="alert" className="st-gargalo rounded-xl p-4 m-0 mb-5 text-sm">
          {erro}
        </p>
      )}
      <div className="grid md:grid-cols-3 gap-3.5">
        <div className="flex flex-col gap-3.5 items-start p-[22px] border border-dotted border-sombra rounded-[14px] min-h-[180px]">
          {icon.store}
          <b className="font-display font-semibold text-lg">Conectar Nuvemshop</b>
          <span className="text-[13.5px] text-duna">Pedidos e clientes importados direto da loja. Chega na próxima fase, depois da conta de parceiro.</span>
          <span className="lbl">Em breve</span>
        </div>
        <div className="flex flex-col gap-3.5 items-start p-[22px] border border-dotted border-sombra rounded-[14px] min-h-[180px]">
          {icon.bag}
          <b className="font-display font-semibold text-lg">Conectar Shopify</b>
          <span className="text-[13.5px] text-duna">Mesma leitura, pela integração da Shopify.</span>
          <span className="lbl">Em breve</span>
        </div>
        <form action={uploadSheetAction} className="flex flex-col gap-3.5 items-start p-[22px] border border-[var(--rule-strong)] rounded-[14px] bg-deep min-h-[180px]">
          {icon.sheet}
          <b className="font-display font-semibold text-lg">Subir planilha</b>
          <span className="text-[13.5px] text-duna">CSV do jeito que estiver. A gente organiza. CPF, endereço e dados de pagamento são descartados na leitura.</span>
          <label className="sr-only" htmlFor="planilha">
            Arquivo CSV
          </label>
          <input id="planilha" name="planilha" type="file" accept=".csv,text/csv,.txt" required className="text-sm max-w-full file:btn file:mr-3" />
          <button className="btn btn-solid" type="submit">
            Ler a planilha
          </button>
        </form>
      </div>
      <div className="flex flex-wrap gap-x-[18px] gap-y-2 mt-[22px] text-[13.5px] text-duna">
        <Label className="w-full">Só precisamos de três coisas</Label>
        {[
          ["quem", "comprou"],
          ["quando", "comprou"],
          ["quanto", "gastou"],
        ].map(([a, b]) => (
          <span key={a}>
            <i className="not-italic text-bone font-mono text-xs border border-[var(--rule)] rounded-md px-2 py-0.5 mr-1.5">{a}</i>
            {b}
          </span>
        ))}
      </div>
      {stagingTools && (
        <form action={useDemoSheetAction} className="mt-6 flex flex-wrap items-center gap-3">
          <button className="btn" type="submit">
            Usar a planilha de exemplo da Fôlego
          </button>
          <a className="text-sm text-duna underline underline-offset-4" href="/api/demo/planilha-folego">
            Baixar a planilha de exemplo (CSV, dados fictícios)
          </a>
        </form>
      )}
      <div className="mt-10 pt-5 border-t border-[var(--rule)]">
        <Say>A venda que você procura já está na sua base.</Say>
      </div>
    </>
  );
}
