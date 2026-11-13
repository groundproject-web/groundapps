import Link from "next/link";
import { GroundMark, Label, Say } from "@ground/ui";

export default function Home() {
  return (
    <main id="conteudo" className="max-w-[980px] mx-auto px-4 sm:px-6 py-10 flex flex-col gap-7">
      <section className="rounded-[18px] p-[clamp(28px,5vw,64px)] bg-deep border border-[var(--rule)] flex flex-col gap-6">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <GroundMark width={120} />
          <Label>Ground Project</Label>
        </div>
        <h1 className="font-serif font-normal text-[clamp(40px,6vw,72px)] leading-[1.02] m-0 tracking-[-0.01em] text-balance">
          <em className="not-italic font-display font-extrabold block text-[0.5em] tracking-[0.02em] uppercase mb-3.5">Paid attention → owned ground</em>
          Crescimento construído, não alugado.
        </h1>
        <p className="text-[clamp(17px,1.8vw,21px)] leading-normal m-0 max-w-[60ch]">Dois apps, uma conta. O Sketch mostra quem é a sua cliente ideal e onde ela está. O Marco Zero faz quem já comprou voltar, com uma missão por semana.</p>
        <div className="flex gap-2.5 flex-wrap">
          <Link href="/entrar" className="btn btn-solid">
            Entrar
          </Link>
          <Link href="/criar-conta" className="btn">
            Criar conta
          </Link>
        </div>
      </section>
      <section className="grid md:grid-cols-2 gap-4" aria-label="Os dois apps">
        <article className="bg-panel rounded-[18px] p-7 flex flex-col gap-3 st-fato">
          <Label>Recompra</Label>
          <h2 className="font-display font-extrabold text-2xl uppercase m-0">Ground Marco Zero</h2>
          <Say>A venda que você procura já está na sua base.</Say>
          <p className="text-duna m-0">Em vez de investir mais em anúncio, recupere quem já te conhece. É mais barato e mais rápido.</p>
        </article>
        <article className="bg-panel rounded-[18px] p-7 flex flex-col gap-3 st-hipotese">
          <Label>Aquisição</Label>
          <h2 className="font-display font-extrabold text-2xl uppercase m-0">Ground Sketch</h2>
          <Say>Você sai com o plano e já dá os primeiros passos.</Say>
          <p className="text-duna m-0">Aquisição construída, não alugada.</p>
        </article>
      </section>
      <footer className="flex gap-4 flex-wrap text-sm text-duna">
        <Link href="/legal/termos" className="underline underline-offset-4">
          Termos de uso (rascunho)
        </Link>
        <Link href="/legal/privacidade" className="underline underline-offset-4">
          Política de privacidade (rascunho)
        </Link>
        <Link href="/ui" className="underline underline-offset-4">
          Design system
        </Link>
      </footer>
    </main>
  );
}
