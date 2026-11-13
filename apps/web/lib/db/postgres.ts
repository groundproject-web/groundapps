import postgres from "postgres";
import type { Db, Queryable } from "./types";

/**
 * Postgres do Supabase via postgres.js (DATABASE_URL do pooler, modo transação).
 * As consultas do lojista rodam com `set local role authenticated` e os claims do JWT,
 * então a mesma RLS das migrations vale aqui.
 */
export function createPostgresDb(url: string): Db {
  const sql = postgres(url, { prepare: false, max: 5, idle_timeout: 20 });
  const wrap = (t: postgres.Sql | postgres.TransactionSql): Queryable => ({
    async query<T>(text: string, params: unknown[] = []) {
      return (await t.unsafe(text, params as never[])) as unknown as T[];
    },
  });
  return {
    kind: "postgres",
    query: (text, params) => wrap(sql).query(text, params),
    exec: async (text) => void (await sql.unsafe(text)),
    service: (fn) => sql.begin((t) => fn(wrap(t))) as never,
    asUser: (userId, fn) =>
      sql.begin(async (t) => {
        await t.unsafe(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: userId, role: "authenticated" })]);
        await t.unsafe("set local role authenticated");
        return fn(wrap(t));
      }) as never,
  };
}
