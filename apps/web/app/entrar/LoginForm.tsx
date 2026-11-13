"use client";
import { useActionState } from "react";
import { loginAction } from "../actions/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="lbl">E-mail</span>
        <input name="email" type="email" required autoComplete="email" className="field" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="lbl">Senha</span>
        <input name="password" type="password" required autoComplete="current-password" className="field" />
      </label>
      {state?.error && (
        <p role="alert" className="m-0 text-sm st-gargalo rounded-lg p-3">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn btn-solid" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
