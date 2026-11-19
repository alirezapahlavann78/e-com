/**
 * Offline-friendly database bootstrap.
 *
 * Applies the DDL derived from `prisma/schema.prisma` to DATABASE_URL and, with
 * `--reset`, wipes the public schema first. Use this when the Prisma CLI cannot
 * download its native migration engine; otherwise `prisma migrate dev` is the
 * recommended path.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { schemaToSql } from "./schema-to-sql.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(here, "..", "prisma", "schema.prisma");
const reset = process.argv.includes("--reset");
const url = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:55432/ecom_aghaci";

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

async function main() {
  await ensureDatabase(url);
  const client = new pg.Client({ connectionString: url });
  await client.connect();

  if (reset) {
    await client.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    console.log("✔ public schema reset");
  }

  const ddl = schemaToSql(readFileSync(schemaPath, "utf8"));
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
  await client.end();
  console.log(`✔ database schema ready (${applied}/${statements.length} statements)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
