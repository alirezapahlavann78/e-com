/**
 * Minimal `.env` loader for the standalone scripts (no dependencies).
 *
 * Walks up from the repository scripts directory until it finds a `.env`, and
 * only fills variables that are not already set in the environment.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function loadEnv(start = dirname(fileURLToPath(import.meta.url))) {
  let current = resolve(start);
  let file = null;
  for (let depth = 0; depth < 6; depth += 1) {
    const candidate = join(current, ".env");
    if (existsSync(candidate)) {
      file = candidate;
      break;
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  if (!file) return null;

  for (const rawLine of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const key = match[1];
    let value = (match[2] ?? "").trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
  return file;
}
