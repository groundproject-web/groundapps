import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { Db } from "./types";

/** Acha a raiz do repositório (onde fica a pasta supabase/). */
export function repoRoot(start = process.cwd()): string {
  let dir = start;
  for (let i = 0; i < 6; i++) {
    if (existsSync(join(/*turbopackIgnore: true*/ dir, "supabase", "migrations"))) return dir;
    dir = join(/*turbopackIgnore: true*/ dir, "..");
  }
  throw new Error("Pasta supabase/migrations não encontrada");
}

/** Aplica o shim local (só PGlite) e as migrations em ordem, uma vez cada. */
export async function migrate(db: Db, opts: { includeLocalShim: boolean; root?: string }): Promise<string[]> {
  const root = opts.root ?? repoRoot();
  const applied: string[] = [];
  if (opts.includeLocalShim) await db.exec(readFileSync(join(root, "supabase", "local", "000_supabase_shim.sql"), "utf8"));
  await db.exec(`create table if not exists public._migrations (name text primary key, applied_at timestamptz not null default now())`);
  const done = new Set((await db.query<{ name: string }>("select name from public._migrations")).map((r) => r.name));
  const files = readdirSync(join(root, "supabase", "migrations")).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    if (done.has(f)) continue;
    await db.exec(readFileSync(join(root, "supabase", "migrations", f), "utf8"));
    await db.query("insert into public._migrations(name) values ($1)", [f]);
    applied.push(f);
  }
  return applied;
}
