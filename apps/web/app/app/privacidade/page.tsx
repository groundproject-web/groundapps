import { Card, PageHeader } from "@ground/ui";
import { getOrgContext } from "@/lib/orgs";
import { TopBar } from "@/components/TopBar";
import { requestDeletionAction } from "@/app/actions/billing";

export const metadata = { title: "Seus dados" };

export default async function Privacidade({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await getOrgContext();
  const sp = await searchParams;
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar ctx={ctx} />
      <main id="conteudo" className="py-9 px-4 md:px-6 max-w-[760px] w-full mx-auto flex flex-col gap-5">
        <PageHeader label="Seus dados" title="Você é a dona dos dados das suas clientes." sub="Pela LGPD, a loja é a controladora e a Ground é a operadora. A gente guarda só o mínimo: quem comprou, quando, quanto e o contato." />
        <Card status="fato" title="O que guardamos">
          <ul className="m-0 pl-[18px] text-sm text-duna flex flex-col gap-1">
            <li>Nome da cliente, pedidos (data, valor, produto, cupom).</li>
            <li>Telefone e e-mail, criptografados.</li>
            <li>Dos prints do check-in, só o resumo classificado, sem nome de cliente. O arquivo é apagado em até 30 dias.</li>
          </ul>
        </Card>
        <Card status="sem_info" title="O que nunca guardamos">
          <p className="m-0 text-sm text-duna">CPF, endereço e dados de pagamento. Essas colunas são descartadas na leitura da planilha.</p>
        </Card>
        <Card status="gargalo" title="Apagar todos os dados">
          {ctx.org.is_demo ? (
            <p className="m-0 text-sm text-duna">Loja de demonstração: não se aplica.</p>
          ) : sp.pedido ? (
            <p className="m-0 text-sm" role="status">
              Pedido registrado. Os dados são apagados em até 30 dias.
            </p>
          ) : (
            <form action={requestDeletionAction} className="flex flex-col gap-2">
              <p className="m-0 text-sm text-duna">Apaga clientes, pedidos, missões e leituras desta loja em até 30 dias. Não dá para desfazer.</p>
              <button className="btn self-start" type="submit">
                Pedir a exclusão
              </button>
            </form>
          )}
        </Card>
      </main>
    </div>
  );
}
