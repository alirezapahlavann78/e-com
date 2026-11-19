/**
 * Starts a throwaway local PostgreSQL server (binaries shipped through npm via
 * `embedded-postgres`) so the stack can run without Docker.
 *
 *   pnpm db:local          # start on PG_PORT (default 55432), data in .pgdata/
 *
 * The server is a real PostgreSQL 18 instance; connection string defaults are
 * already in `.env.example`.
 */
import EmbeddedPostgres from "embedded-postgres";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.PG_DATA_DIR ?? join(here, "..", ".pgdata");
const port = Number(process.env.PG_PORT ?? 55432);
const user = process.env.PG_USER ?? "postgres";
const password = process.env.PG_PASSWORD ?? "postgres";
const database = process.env.PG_DATABASE ?? "ecom_aghaci";

mkdirSync(dataDir, { recursive: true });

const instance = new EmbeddedPostgres({
  databaseDir: dataDir,
  user,
  password,
  port,
  persistent: true,
});

await instance.initialise().catch(() => undefined);
await instance.start();

const admin = new pg.Client({ connectionString: `postgresql://${user}:${password}@127.0.0.1:${port}/postgres` });
await admin.connect();
const existing = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [database]);
if (!existing.rowCount) await admin.query(`CREATE DATABASE "${database}"`);
await admin.end();

console.log(`✔ PostgreSQL ready on postgresql://${user}:${password}@127.0.0.1:${port}/${database}`);

const shutdown = async () => {
  await instance.stop().catch(() => undefined);
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
setInterval(() => undefined, 1 << 30);
