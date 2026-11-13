"use client";
import { useActionState } from "react";
import { signupAction } from "../actions/auth";

export function SignupForm() {
  const [state, action, pending] = useActionState(signupAction, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="lbl">Seu nome</span>
        <input name="owner" required autoComplete="given-name" className="field" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="lbl">Nome da loja</span>
        <input name="store" required className="field" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="lbl">E-mail</span>
        <input name="email" type="email" required autoComplete="email" className="field" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="lbl">Senha (10 caracteres ou mais)</span>
        <input name="password" type="password" required minLength={10} autoComplete="new-password" className="field" />
      </label>
      {state?.error && (
        <p role="alert" className="m-0 text-sm st-gargalo rounded-lg p-3">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn btn-solid" disabled={pending}>
        {pending ? "Criando…" : "Criar conta"}
      </button>
    </form>
  );
}
