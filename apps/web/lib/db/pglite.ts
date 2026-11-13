import { AsyncLocalStorage } from "node:async_hooks";
import { PGlite } from "@electric-sql/pglite";
import type { Db, Queryable } from "./types";

/**
 * PGlite: Postgres real compilado para WASM, rodando no próprio processo.
 * Permite rodar as migrations, a RLS e o app inteiro sem Docker nem conta externa.
 * Transações são serializadas (PGlite tem uma conexão só). Abrir uma transação
 * de dentro de outra travaria a fila: isso vira erro imediato, não um travamento.
 */
export function createPgliteDb(dataDir?: string): Db {
  const pg = new PGlite(dataDir);
  const inTx = new AsyncLocalStorage<boolean>();
  let chain: Promise<unknown> = Promise.resolve();
  const serialize = <T>(fn: () => Promise<T>): Promise<T> => {
    if (inTx.getStore()) return Promise.reject(new Error("Transação aninhada no banco: use o `t` da transação aberta."));
    const next = chain.then(fn, fn);
    chain = next.catch(() => undefined);
    return next;
  };
  const q: Queryable = {
    async query<T>(sql: string, params: unknown[] = []) {
      const r = await pg.query(sql, params as never[]);
      return r.rows as T[];
    },
  };
  const tx = <T>(prelude: (t: Queryable) => Promise<void>, fn: (t: Queryable) => Promise<T>) =>
    serialize(() =>
      inTx.run(true, async () => {
        await pg.exec("begin");
        try {
          await prelude(q);
          const out = await fn(q);
          await pg.exec("commit");
          return out;
        } catch (e) {
          await pg.exec("rollback");
          throw e;
        }
      }),
    );
  return {
    kind: "pglite",
    query: (sql, params) => serialize(() => q.query(sql, params)),
    exec: (sql) => serialize(async () => void (await pg.exec(sql))),
    service: (fn) => tx(async () => {}, fn),
    asUser: (userId, fn) =>
      tx(async (t) => {
        await t.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: userId, role: "authenticated" })]);
        await t.query("set local role authenticated");
      }, fn),
  };
}
