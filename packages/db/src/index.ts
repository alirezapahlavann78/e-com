import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/client";

export * from "../generated/client";
export { PrismaClient };

export const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:55432/ecom_aghaci";

export const createAdapter = (connectionString: string = DATABASE_URL) =>
  new PrismaPg({ connectionString });

export const createPrismaClient = (connectionString: string = DATABASE_URL) =>
  new PrismaClient({ adapter: createAdapter(connectionString) });

export const prisma = createPrismaClient();
