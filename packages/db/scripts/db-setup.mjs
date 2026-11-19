/**
 * Offline-friendly database bootstrap.
 *
 * Applies the DDL derived from `prisma/schema.prisma` to DATABASE_URL and, with
 * `--reset`, wipes the public schema first. Use this when the Prisma CLI cannot
 * download its native migration engine; otherwise `prisma migrate dev` is the
 * recommended path.
 *
 * The script is idempotent and repairs two kinds of environment drift:
 *  1. missing columns (schema changes applied after the database was created) —
 *     fixed with `ALTER TABLE ... ADD COLUMN`, no data loss;
 *  2. a database created with a non-UTF8 encoding (typical on Windows, where
 *     initdb inherits the ANSI code page) — Postgres then rejects Persian text
 *     with `22P05: character ... has no equivalent in encoding "WIN1252"`.
 *     With `--reset` the database is recreated as UTF8; without it the script
 *     stops early and explains how to fix it.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { loadEnv } from "./load-env.mjs";
import { schemaColumns, schemaToSql } from "./schema-to-sql.mjs";

loadEnv();

const here = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(here, "..", "prisma", "schema.prisma");
const reset = process.argv.includes("--reset");
const url = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:55432/ecom_aghaci";

/** Encodings that can store Persian/Arabic text. SQL_ASCII passes bytes through. */
const ACCEPTED_ENCODINGS = new Set(["UTF8", "SQL_ASCII"]);

const quote = (identifier) => `"${identifier.replace(/"/g, '""')}"`;
const clientOptions = { options: "-c client_encoding=UTF8" };

function targetUrl(connectionString, databaseName) {
  const parsed = new URL(connectionString);
  parsed.pathname = `/${databaseName}`;
  return parsed.toString();
}

async function ensureDatabase(connectionString) {
  const parsed = new URL(connectionString);
  const dbName = parsed.pathname.replace(/^\//, "");
  const admin = new pg.Client({ connectionString: targetUrl(connectionString, "postgres"), ...clientOptions });
  await admin.connect();

  const existing = await admin.query(
    "SELECT pg_encoding_to_char(encoding) AS encoding FROM pg_database WHERE datname = $1",
    [dbName],
  );

  let recreated = false;

  if (!existing.rowCount) {
    await admin.query(
      `CREATE DATABASE ${quote(dbName)} WITH ENCODING 'UTF8' TEMPLATE template0 LC_COLLATE 'C' LC_CTYPE 'C'`,
    );
    console.log(`✔ created database ${dbName} (UTF8)`);
  } else {
    const encoding = existing.rows[0].encoding;
    if (ACCEPTED_ENCODINGS.has(encoding)) {
      console.log(`✔ database ${dbName} encoding: ${encoding}`);
    } else if (reset) {
      await admin.query(
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
        [dbName],
      );
      await admin.query(`DROP DATABASE ${quote(dbName)}`);
      await admin.query(
        `CREATE DATABASE ${quote(dbName)} WITH ENCODING 'UTF8' TEMPLATE template0 LC_COLLATE 'C' LC_CTYPE 'C'`,
      );
      recreated = true;
      console.log(`✔ database ${dbName} recreated with UTF8 (was ${encoding})`);
    } else {
      await admin.end();
      throw new Error(
        [
          `Database "${dbName}" uses encoding ${encoding}; Persian text cannot be stored in it.`,
          "This happens on Windows when the Postgres cluster was initialised with the system code page.",
          "",
          "Fix it with one of:",
          "  pnpm db:reset                       # drops and recreates the database as UTF8",
          "  remove packages/db/.pgdata          # then: pnpm db:local --fresh",
          "",
          "Or point DATABASE_URL at a UTF8 database (e.g. the Docker Postgres on port 5432).",
        ].join("\n"),
      );
    }
  }

  await admin.end();
  return { recreated };
}

/** Reads the columns that actually exist right now: Map<table, Set<column>>. */
async function readExistingColumns(client) {
  const result = await client.query(
    "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'",
  );
  const map = new Map();
  for (const row of result.rows) {
    if (!map.has(row.table_name)) map.set(row.table_name, new Set());
    map.get(row.table_name).add(row.column_name);
  }
  return map;
}

/**
 * Adds columns that the schema declares but the database is missing.
 * `P2022: The column X does not exist` comes from exactly this drift.
 */
async function repairDrift(client, schemaSource) {
  const existing = await readExistingColumns(client);
  const added = [];
  const warnings = [];

  for (const column of schemaColumns(schemaSource)) {
    const table = existing.get(column.table);
    if (!table) continue; // table was just created with all of its columns
    if (table.has(column.column)) continue;

    const base = `ALTER TABLE ${quote(column.table)} ADD COLUMN ${quote(column.column)} ${column.type}`;
    const withDefault = column.defaultValue ? `${base} DEFAULT ${column.defaultValue}` : base;
    const strict = column.notNull ? `${withDefault} NOT NULL` : withDefault;

    try {
      await client.query(strict);
      added.push(`${column.table}.${column.column}`);
      table.add(column.column);
    } catch (error) {
      // 23502: existing rows would violate NOT NULL → add the column as nullable
      // instead of losing data, and tell the operator which column needs a backfill.
      if (error.code === "23502" && column.notNull) {
        await client.query(withDefault);
        added.push(`${column.table}.${column.column} (nullable)`);
        warnings.push(`${column.table}.${column.column} added as NULL — backfill existing rows if the column is required`);
        table.add(column.column);
        continue;
      }
      console.error(`✖ could not add column ${column.table}.${column.column}`);
      throw error;
    }
  }

  return { added, warnings };
}

async function main() {
  const { recreated } = await ensureDatabase(url);
  const client = new pg.Client({ connectionString: url, ...clientOptions });
  await client.connect();

  if (reset && !recreated) {
    await client.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    console.log("✔ public schema reset");
  }
  if (recreated) {
    await client.query("CREATE SCHEMA IF NOT EXISTS public;");
  }

  const schemaSource = readFileSync(schemaPath, "utf8");
  const ddl = schemaToSql(schemaSource);
  const statements = ddl
    .split(/;\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  let applied = 0;
  for (const statement of statements) {
    try {
      await client.query(statement);
      applied += 1;
    } catch (error) {
      if (error.code === "42P07" || error.code === "42710" || error.code === "42P16") continue; // already exists
      console.error("✖ failed statement:\n", statement.slice(0, 400));
      throw error;
    }
  }
  console.log(`✔ database schema ready (${applied}/${statements.length} statements)`);

  const { added, warnings } = await repairDrift(client, schemaSource);
  if (added.length) {
    console.log(`✔ repaired schema drift — added ${added.length} column(s):`);
    for (const column of added) console.log(`   • ${column}`);
  } else {
    console.log("✔ no schema drift detected");
  }
  for (const warning of warnings) console.warn(`⚠ ${warning}`);

  const encoding = await client.query("SHOW client_encoding");
  console.log(`✔ client encoding: ${encoding.rows[0].client_encoding}`);

  await client.end();
}

main().catch((error) => {
  console.error(`\n✖ ${error.message ?? error}\n`);
  process.exit(1);
});
