import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/client";
import { loadEnvFile } from "./env";

export * from "../generated/client";
export { PrismaClient };
export { loadEnvFile };

// `pnpm db:seed` and the API both import this module; loading the monorepo .env
// here keeps every entry point on the same DATABASE_URL.
loadEnvFile(process.cwd());

export const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:55432/ecom_aghaci";

/**
 * `client_encoding=UTF8` is forced explicitly: on Windows the server locale can
 * default the client encoding to something like WIN1252, which makes Persian
 * text fail with `22P05` even when the database itself is UTF8.
 */
export const createAdapter = (connectionString: string = DATABASE_URL) =>
  new PrismaPg({ connectionString, options: "-c client_encoding=UTF8" });

export const createPrismaClient = (connectionString: string = DATABASE_URL) =>
  new PrismaClient({ adapter: createAdapter(connectionString) });

export const prisma = createPrismaClient();
