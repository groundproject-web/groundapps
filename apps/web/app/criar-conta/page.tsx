import Link from "next/link";
import { GroundMark } from "@ground/ui";
import { SignupForm } from "./SignupForm";

export const metadata = { title: "Criar conta" };

export default function CriarConta() {
  return (
    <main id="conteudo" className="max-w-[440px] mx-auto px-4 py-12 flex flex-col gap-6">
      <GroundMark width={110} />
      <h1 className="h1 m-0">Criar conta</h1>
      <p className="sub m-0">Uma conta para os dois apps. Depois de criar, a Ground libera o plano da sua loja.</p>
      <SignupForm />
      <p className="text-sm text-duna m-0">
        Ao criar a conta você concorda com os{" "}
        <Link href="/legal/termos" className="text-bone underline underline-offset-4">
          Termos de uso
        </Link>{" "}
        e a{" "}
        <Link href="/legal/privacidade" className="text-bone underline underline-offset-4">
          Política de privacidade
        </Link>{" "}
        (rascunhos em revisão jurídica).
      </p>
    </main>
  );
}
