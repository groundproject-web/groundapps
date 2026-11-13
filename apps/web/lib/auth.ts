import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import { env } from "./env";
import { hashPassword, sign, unsign, verifyPassword } from "./crypto";

const SESSION = "g_session";
const ORG = "g_org";
const MAX_AGE = 60 * 60 * 24 * 14;

export interface Session {
  userId: string;
  email: string;
}

/**
 * Autenticação.
 * - Com SUPABASE_URL: e-mail e senha validados pelo Supabase Auth (REST /auth/v1).
 * - Sem: login local (senha com scrypt no PGlite). Só para desenvolvimento e demonstração.
 * Em ambos, a sessão do app é um cookie assinado (HttpOnly, SameSite=Lax) com o id do usuário,
 * que vira o `sub` dos claims usados pela RLS.
 */
export async function getSession(): Promise<Session | null> {
  const raw = unsign((await cookies()).get(SESSION)?.value);
  if (!raw) return null;
  const [userId, email, exp] = raw.split("|");
  if (!userId || Number(exp) < Date.now() / 1000) return null;
  return { userId, email };
}

export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/entrar");
  return s;
}

async function setSession(userId: string, email: string) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  (await cookies()).set(SESSION, sign(`${userId}|${email}|${exp}`), { httpOnly: true, sameSite: "lax", secure: env.appEnv !== "local", path: "/", maxAge: MAX_AGE });
}

export async function signOut() {
  const c = await cookies();
  c.delete(SESSION);
  c.delete(ORG);
}

export async function setCurrentOrg(orgId: string) {
  (await cookies()).set(ORG, sign(orgId), { httpOnly: true, sameSite: "lax", secure: env.appEnv !== "local", path: "/", maxAge: MAX_AGE });
}

export async function getCurrentOrgId(): Promise<string | null> {
  return unsign((await cookies()).get(ORG)?.value);
}

async function supabaseAuth(path: string, body: unknown): Promise<{ user?: { id: string; email: string }; error?: string }> {
  const res = await fetch(`${env.supabaseUrl}/auth/v1/${path}`, {
    method: "POST",
    headers: { apikey: env.supabaseAnonKey ?? "", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { user?: { id: string; email: string }; id?: string; email?: string; error_description?: string; msg?: string };
  if (!res.ok) return { error: json.error_description ?? json.msg ?? "Não foi possível entrar." };
  const user = json.user ?? (json.id ? { id: json.id, email: json.email ?? "" } : undefined);
  return { user };
}

export async function signInWithPassword(email: string, password: string): Promise<string | null> {
  const e = email.trim().toLowerCase();
  if (env.supabaseUrl) {
    const r = await supabaseAuth("token?grant_type=password", { email: e, password });
    if (!r.user) return r.error ?? "E-mail ou senha incorretos.";
    await setSession(r.user.id, e);
    return null;
  }
  const db = await getDb();
  const rows = await db.service((t) => t.query<{ id: string; password_hash: string }>("select u.id, c.password_hash from auth.users u join public.local_credentials c on c.user_id = u.id where u.email = $1", [e]));
  if (!rows[0] || !verifyPassword(password, rows[0].password_hash)) return "E-mail ou senha incorretos.";
  await setSession(rows[0].id, e);
  return null;
}

/** Cria a conta e a organização (loja). Os módulos só são liberados pela Ground (billing manual). */
export async function signUp(email: string, password: string, storeName: string, ownerName: string): Promise<string | null> {
  const e = email.trim().toLowerCase();
  if (password.length < 10) return "Use uma senha com pelo menos 10 caracteres.";
  let userId: string;
  const db = await getDb();
  if (env.supabaseUrl) {
    const r = await supabaseAuth("signup", { email: e, password });
    if (!r.user) return r.error ?? "Não foi possível criar a conta.";
    userId = r.user.id;
  } else {
    const exists = await db.service((t) => t.query("select 1 from auth.users where email = $1", [e]));
    if (exists.length) return "Já existe uma conta com esse e-mail.";
    userId = randomUUID();
    await db.service(async (t) => {
      await t.query("insert into auth.users(id, email) values ($1, $2)", [userId, e]);
      await t.query("insert into public.local_credentials(user_id, password_hash) values ($1, $2)", [userId, hashPassword(password)]);
    });
  }
  const slug = `${storeName.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40)}-${userId.slice(0, 6)}`;
  const orgId = await db.service(async (t) => {
    const [o] = await t.query<{ id: string }>("insert into organizations(name, slug, owner_display_name) values ($1, $2, $3) returning id", [storeName.trim(), slug, ownerName.trim()]);
    await t.query("insert into memberships(organization_id, user_id, role) values ($1, $2, 'owner')", [o.id, userId]);
    await t.query("insert into billing_events(organization_id, kind, detail) values ($1, 'conta_criada', '{}')", [o.id]);
    return o.id;
  });
  await setSession(userId, e);
  await setCurrentOrg(orgId);
  return null;
}

/** Login de demonstração (só fora de produção): entra como Carla, João ou sócio sem senha. */
export async function signInDemo(email: string): Promise<boolean> {
  if (env.appEnv === "production") return false;
  const db = await getDb();
  const rows = await db.service((t) => t.query<{ id: string }>("select u.id from auth.users u join public.demo_accounts d on d.user_id = u.id where u.email = $1", [email]));
  if (!rows[0]) return false;
  await setSession(rows[0].id, email);
  return true;
}

export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const db = await getDb();
  return db.asUser(userId, async (t) => (await t.query<{ ok: boolean }>("select public.is_platform_admin() as ok"))[0].ok);
}

export async function requireAdmin(): Promise<Session> {
  const s = await requireSession();
  if (!(await isPlatformAdmin(s.userId))) redirect("/app");
  return s;
}
