/**
 * Camada de banco única: o mesmo SQL roda no PGlite (local/demo/testes)
 * e no Postgres do Supabase (staging/produção), via postgres.js.
 */
export interface Queryable {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}

export interface Db extends Queryable {
  kind: "pglite" | "postgres";
  /** Transação como serviço (ignora RLS). Use só em rotinas do servidor e no /admin após checar o papel. */
  service<T>(fn: (tx: Queryable) => Promise<T>): Promise<T>;
  /** Transação como o usuário logado: RLS ligada (role authenticated + claims do JWT). */
  asUser<T>(userId: string, fn: (tx: Queryable) => Promise<T>): Promise<T>;
  exec(sql: string): Promise<void>;
}
