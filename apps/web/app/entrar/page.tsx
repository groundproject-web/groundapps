import Link from "next/link";
import { GroundMark, Label } from "@ground/ui";
import { LoginForm } from "./LoginForm";
import { demoLoginAction } from "../actions/auth";
import { stagingTools } from "@/lib/env";
import { DEMO_ACCOUNTS } from "@/lib/seed";

export const metadata = { title: "Entrar" };

export default function Entrar() {
  return (
    <main id="conteudo" className="max-w-[440px] mx-auto px-4 py-12 flex flex-col gap-6">
      <GroundMark width={110} />
      <h1 className="h1 m-0">Entrar</h1>
      <LoginForm />
      <p className="text-sm text-duna m-0">
        Ainda não tem conta?{" "}
        <Link href="/criar-conta" className="text-bone underline underline-offset-4">
          Criar conta
        </Link>
      </p>
      {stagingTools && (
        <section className="st-hipotese rounded-[14px] p-5 flex flex-col gap-3 bg-deep" aria-labelledby="demo">
          <Label as="h2">
            <span id="demo">Demonstração · dados fictícios</span>
          </Label>
          <p className="m-0 text-sm text-duna">Entre direto como uma das contas de exemplo. Só existe fora de produção.</p>
          <div className="flex flex-col gap-2">
            {[
              [DEMO_ACCOUNTS.carla, "Carla · Fôlego Nutrição", "Marco Zero + Sketch"],
              [DEMO_ACCOUNTS.joao, "João · Brutal Wear", "Sketch sozinho"],
              [DEMO_ACCOUNTS.socio, "Sócio da Ground", "Painel interno"],
            ].map(([email, who, what]) => (
              <form key={email} action={demoLoginAction}>
                <input type="hidden" name="email" value={email} />
                <button type="submit" className="btn w-full justify-between">
                  <span>{who}</span>
                  <span className="text-duna normal-case tracking-normal font-body">{what}</span>
                </button>
              </form>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
