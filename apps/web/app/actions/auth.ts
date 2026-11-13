"use server";
import { redirect } from "next/navigation";
import { setCurrentOrg, signInDemo, signInWithPassword, signOut, signUp } from "@/lib/auth";

export async function loginAction(_: unknown, form: FormData) {
  const err = await signInWithPassword(String(form.get("email") ?? ""), String(form.get("password") ?? ""));
  if (err) return { error: err };
  redirect("/app");
}

export async function signupAction(_: unknown, form: FormData) {
  const err = await signUp(String(form.get("email") ?? ""), String(form.get("password") ?? ""), String(form.get("store") ?? "Minha loja"), String(form.get("owner") ?? ""));
  if (err) return { error: err };
  redirect("/app");
}

export async function demoLoginAction(form: FormData) {
  const ok = await signInDemo(String(form.get("email")));
  redirect(ok ? (String(form.get("email")).startsWith("socio") ? "/admin" : "/app") : "/entrar");
}

export async function logoutAction() {
  await signOut();
  redirect("/");
}

export async function switchOrgAction(form: FormData) {
  await setCurrentOrg(String(form.get("org")));
  redirect("/app");
}
