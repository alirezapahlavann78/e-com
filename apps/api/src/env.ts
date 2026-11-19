import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { config } from "dotenv";

/**
 * Loads the monorepo `.env` regardless of the process working directory
 * (turbo runs each app with its own cwd). Imported first in `main.ts`.
 */
function findEnvFile(start: string): string | null {
  let current = resolve(start);
  for (let depth = 0; depth < 6; depth += 1) {
    const candidate = join(current, ".env");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

const envFile = findEnvFile(process.cwd());
if (envFile) config({ path: envFile });
