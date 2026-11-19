import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/**
 * Loads the nearest monorepo `.env` (walking up from the given directory)
 * without pulling in a dependency. Existing process env wins, so CI / shell
 * overrides always take precedence.
 *
 * The database scripts and the Prisma client factory use this so that
 * `pnpm db:setup`, `pnpm db:seed` and the API all talk to the same DATABASE_URL
 * regardless of the working directory (turbo runs each package with its own cwd).
 */
export function loadEnvFile(start: string = process.cwd()): string | null {
  let current = resolve(start);
  let found: string | null = null;

  for (let depth = 0; depth < 6; depth += 1) {
    const candidate = join(current, ".env");
    if (existsSync(candidate)) {
      found = candidate;
      break;
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }

  if (!found) return null;

  for (const rawLine of readFileSync(found, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const key = match[1]!;
    let value = (match[2] ?? "").trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }

  return found;
}
