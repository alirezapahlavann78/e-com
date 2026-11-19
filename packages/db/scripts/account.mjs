/**
 * Local account maintenance: unlock locked accounts, reset a password, list users.
 *
 *   pnpm user:unlock                              # clear lockouts for every account
 *   pnpm user:unlock --email=admin@aghaci.local   # clear the lockout for one account
 *   pnpm user:passwd --email=admin@aghaci.local --password=Admin@12345
 *   pnpm user:list
 *
 * The password hash uses the same `scrypt:<salt>:<hash>` format as the API, so a
 * password set here works for both the storefront and the admin panel.
 */
import { randomBytes, scryptSync } from "node:crypto";
import pg from "pg";
import { loadEnv } from "./load-env.mjs";

loadEnv();

const url = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:55432/ecom_aghaci";

const args = new Map(
  process.argv.slice(2).filter((raw) => raw !== "--").map((raw) => {
    const [key, ...rest] = raw.replace(/^--/, "").split("=");
    return [key, rest.length ? rest.join("=") : "true"];
  }),
);

const command = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "unlock";
const email = args.get("email");
const password = args.get("password");

const hashPassword = (value) => {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${scryptSync(value, salt, 64).toString("hex")}`;
};

const quote = (identifier) => `"${identifier.replace(/"/g, '""')}"`;

async function main() {
  const client = new pg.Client({ connectionString: url, options: "-c client_encoding=UTF8" });
  await client.connect();

  try {
    if (command === "list") {
      const { rows } = await client.query(
        `SELECT email, "isAdmin", status, "failedLoginAttempts", "lockoutUntil", "lastLoginAt"
           FROM "User" ORDER BY "isAdmin" DESC, email LIMIT 50`,
      );
      console.table(rows);
      return;
    }

    if (command === "unlock") {
      const { rowCount } = await client.query(
        `UPDATE "User"
            SET "failedLoginAttempts" = 0, "lockoutUntil" = NULL
          WHERE ($1::text IS NULL OR email = $1)
            AND ("lockoutUntil" IS NOT NULL OR "failedLoginAttempts" > 0)`,
        [email ?? null],
      );
      console.log(
        rowCount
          ? `✔ unlocked ${rowCount} account(s)${email ? ` (${email})` : ""}`
          : "✔ nothing to unlock — no account is locked",
      );
      return;
    }

    if (command === "passwd") {
      if (!email || !password) {
        throw new Error("Usage: pnpm user:passwd --email=<email> --password=<new password>");
      }
      if (password.length < 8) throw new Error("Password must be at least 8 characters.");
      const { rows } = await client.query(`SELECT id FROM "User" WHERE email = $1`, [email]);
      if (!rows.length) throw new Error(`No account with email ${email}. Run \`pnpm db:seed\` first.`);
      const userId = rows[0].id;
      await client.query(
        `UPDATE "User"
            SET "passwordHash" = $2, "failedLoginAttempts" = 0, "lockoutUntil" = NULL, status = 'ACTIVE'
          WHERE id = $1`,
        [userId, hashPassword(password)],
      );
      // every existing session must be re-authenticated after a password change
      await client.query(
        `UPDATE "RefreshToken" SET "revokedAt" = NOW() WHERE "userId" = $1 AND "revokedAt" IS NULL`,
        [userId],
      );
      console.log(`✔ password updated for ${email} (account unlocked, sessions revoked)`);
      return;
    }

    throw new Error(`Unknown command "${command}". Use: unlock | passwd | list`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`\n✖ ${error.message ?? error}\n`);
  process.exit(1);
});
