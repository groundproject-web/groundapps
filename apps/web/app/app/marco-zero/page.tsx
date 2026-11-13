import { redirect } from "next/navigation";
import { getMzPage } from "@/lib/mzPage";

export default async function MzIndex() {
  const { hasData, current } = await getMzPage();
  if (!hasData) redirect("/app/marco-zero/conexao");
  redirect(current ? "/app/marco-zero/missao" : "/app/marco-zero/leitura");
}
