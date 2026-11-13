import { logoutAction } from "../actions/auth";

export default function SemLoja() {
  return (
    <main id="conteudo" className="max-w-[560px] mx-auto px-4 py-12 flex flex-col gap-4">
      <h1 className="h1 m-0">Sua conta ainda não tem loja.</h1>
      <p className="sub m-0">Peça para a dona da loja te convidar, ou crie uma conta nova com a sua loja.</p>
      <form action={logoutAction}>
        <button className="btn" type="submit">
          Sair
        </button>
      </form>
    </main>
  );
}
