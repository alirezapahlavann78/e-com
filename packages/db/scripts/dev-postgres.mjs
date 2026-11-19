/**
 * Starts a throwaway local PostgreSQL server (binaries shipped through npm via
 * `embedded-postgres`) so the stack can run without Docker.
 *
 *   pnpm db:local          # start on PG_PORT (default 55432), data in .pgdata/
 *   pnpm db:local:fresh    # delete the cluster first and re-initdb (UTF8)
 *
 * The cluster is initialised with `--encoding=UTF8 --locale=C` so Persian text
 * works on every platform. Windows would otherwise inherit the ANSI code page
 * (WIN1252) and reject Persian inserts with `22P05`.
 */
import EmbeddedPostgres from "embedded-postgres";
import { mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { loadEnv } from "./load-env.mjs";

loadEnv();

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.PG_DATA_DIR ?? join(here, "..", ".pgdata");
const port = Number(process.env.PG_PORT ?? 55432);
const user = process.env.PG_USER ?? "postgres";
const password = process.env.PG_PASSWORD ?? "postgres";
const database = process.env.PG_DATABASE ?? "ecom_aghaci";
const fresh = process.argv.includes("--fresh");

if (fresh) {
  rmSync(dataDir, { recursive: true, force: true });
  console.log(`✔ removed existing cluster at ${dataDir}`);
}

mkdirSync(dataDir, { recursive: true });

const instance = new EmbeddedPostgres({
  databaseDir: dataDir,
  user,
  password,
  port,
  persistent: true,
  autoRehydrateSymlinks: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
});

await instance.initialise().catch(() => undefined);
await instance.start();

const admin = new pg.Client({
  connectionString: `postgresql://${user}:${password}@127.0.0.1:${port}/postgres`,
  options: "-c client_encoding=UTF8",
});
await admin.connect();
const existing = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [database]);
if (!existing.rowCount) await admin.query(`CREATE DATABASE "${database}" WITH ENCODING 'UTF8' TEMPLATE template0 LC_COLLATE 'C' LC_CTYPE 'C'`);

const encoding = await admin.query("SELECT pg_encoding_to_char(encoding) AS encoding FROM pg_database WHERE datname = $1", [database]);
const serverEncoding = await admin.query("SHOW server_encoding");
await admin.end();

console.log(
  `✔ PostgreSQL ready on postgresql://${user}:${password}@127.0.0.1:${port}/${database} (db encoding: ${encoding.rows[0]?.encoding})`,
);

const dbEncoding = encoding.rows[0]?.encoding ?? "unknown";
if (!["UTF8", "SQL_ASCII"].includes(dbEncoding)) {
  console.warn(
    [
      "",
      `⚠ The database "${database}" uses encoding ${dbEncoding}, so Persian text will fail with 22P05.`,
      "  Fix it with either:",
      "    pnpm db:reset          # recreate the database as UTF8",
      "    pnpm db:local:fresh    # recreate the whole cluster as UTF8 (drops local data)",
      "",
    ].join("\n"),
  );
}
if (!["UTF8", "SQL_ASCII"].includes(serverEncoding.rows[0]?.server_encoding ?? "UTF8")) {
  console.warn(`⚠ cluster encoding is ${serverEncoding.rows[0]?.server_encoding}; run pnpm db:local:fresh for a clean UTF8 cluster.`);
}

const shutdown = async () => {
  await instance.stop().catch(() => undefined);
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
setInterval(() => undefined, 1 << 30);
