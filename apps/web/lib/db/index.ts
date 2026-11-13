import "server-only";
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import { env } from "../env";
import { createPgliteDb } from "./pglite";
import { createPostgresDb } from "./postgres";
import { migrate, repoRoot } from "./migrate";
import type { Db } from "./types";

export type { Db, Queryable } from "./types";

const g = globalThis as unknown as { __groundDb?: Promise<Db> };

/**
 * Banco da aplicação. Com DATABASE_URL → Postgres do Supabase (migrations aplicadas pela CLI do Supabase).
 * Sem DATABASE_URL → PGlite persistido em .data/pglite, com migrations e seed de demonstração no primeiro boot.
 */
export function getDb(): Promise<Db> {
  if (!g.__groundDb) {
    g.__groundDb = (async () => {
      if (env.databaseUrl) return createPostgresDb(env.databaseUrl);
      const root = repoRoot();
      const dir = process.env.PGLITE_DIR ?? join(root, ".data", "pglite");
      mkdirSync(dir, { recursive: true });
      const db = createPgliteDb(dir);
      await migrate(db, { includeLocalShim: true, root });
      const { ensureDemoSeed } = await import("../seed");
      await ensureDemoSeed(db);
      return db;
    })();
    g.__groundDb.catch(() => (g.__groundDb = undefined));
  }
  return g.__groundDb;
}
