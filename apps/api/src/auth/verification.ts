import { randomBytes } from "node:crypto";
import { hashToken } from "./crypto";
import { PrismaService } from "../prisma/prisma.service";

export function createRawToken(bytes = 32) { return randomBytes(bytes).toString("hex"); }

export async function issueEmailVerification(prisma: PrismaService, userId: string) {
  const raw = createRawToken(24);
  const record = await prisma.emailVerificationToken.create({ data: { userId, tokenHash: hashToken(raw), purpose: "EMAIL_VERIFY", expiresAt: new Date(Date.now() + 24 * 3600_000) } });
  return { token: raw, expiresAt: record.expiresAt };
}
