/**
 * Offline-friendly database bootstrap.
 *
 * Applies the DDL derived from `prisma/schema.prisma` to DATABASE_URL and, with
 * `--reset`, wipes the public schema first. Use this when the Prisma CLI cannot
 * download its native migration engine; otherwise `prisma migrate dev` is the
 * recommended path.
 *
 * The script is idempotent and also repairs *drift*: any column that exists in
 * `schema.prisma` but not in the database (typical after pulling new code onto
 * an existing database) is added with `ALTER TABLE ... ADD COLUMN`, so the API
 * stops failing with Prisma `P2022` ("column ... does not exist") without
 * dropping data.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { schemaColumns, schemaToSql } from "./schema-to-sql.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(here, "..", "prisma", "schema.prisma");
const reset = process.argv.includes("--reset");
const url = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:55432/ecom_aghaci";

const quote = (identifier) => `"${identifier.replace(/"/g, '""')}"`;

function targetUrl(connectionString, databaseName) {
  const parsed = new URL(connectionString);
  parsed.pathname = `/${databaseName}`;
  return parsed.toString();
}

async function ensureDatabase(connectionString) {
  const parsed = new URL(connectionString);
  const dbName = parsed.pathname.replace(/^\//, "");
  const adminUrl = targetUrl(connectionString, "postgres");
  const client = new pg.Client({ connectionString: adminUrl });
  await client.connect();
  const existing = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
  if (!existing.rowCount) {
    await client.query(`CREATE DATABASE "${dbName}"`);
    console.log(`✔ created database ${dbName}`);
  }
  await client.end();
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
  await ensureDatabase(url);
  const client = new pg.Client({ connectionString: url });
  await client.connect();

  if (reset) {
    await client.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    console.log("✔ public schema reset");
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

  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
