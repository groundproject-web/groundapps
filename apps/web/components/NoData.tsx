import Link from "next/link";
import { Card } from "@ground/ui";

export function NoData() {
  return (
    <Card status="sem_info" title="Sem base ainda">
      <p className="m-0 text-sm text-duna">Para ler a sua base, conecte a loja ou suba uma planilha.</p>
      <Link href="/app/marco-zero/conexao" className="btn btn-solid self-start">
        Ir para a conexão
      </Link>
    </Card>
  );
}

export function NextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-end gap-2.5 mt-8">
      <Link href={href} className="btn btn-solid">
        {children}
      </Link>
    </div>
  );
}
