import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

const permissions = [
  ["users:read", "Read admin/customer users"],
  ["users:write", "Create/update users"],
  ["rbac:read", "Read roles and permissions"],
  ["rbac:manage", "Manage roles and permissions"],
  ["settings:read", "Read store settings"],
  ["settings:write", "Write store settings"],
  ["audit:read", "Read audit logs"],
] as const;

async function main() {
  await prisma.storeSetting.upsert({
    where: { key: "store.bootstrap" },
    update: { value: { ok: true, sprint: 1 } },
    create: { key: "store.bootstrap", value: { ok: true, sprint: 1 } },
  });

  for (const [key, description] of permissions) {
    await prisma.permission.upsert({
      where: { key },
      update: { description },
      create: { key, description },
    });
  }

  const adminRole = await prisma.role.upsert({
    where: { name: "admin" },
    update: { description: "System administrator", isSystem: true },
    create: { name: "admin", description: "System administrator", isSystem: true },
  });

  const allPermissions = await prisma.permission.findMany();
  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: permission.id },
    });
  }

  const adminEmail = process.env.ADMIN_BOOTSTRAP_EMAIL ?? "admin@aghaci.local";
  const adminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "ChangeMe123!";
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { isAdmin: true, status: "ACTIVE" },
    create: {
      email: adminEmail,
      passwordHash: hashPassword(adminPassword),
      firstName: "Admin",
      lastName: "User",
      isAdmin: true,
      status: "ACTIVE",
      emailVerified: new Date(),
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id },
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      actorEmail: admin.email,
      action: "seed.bootstrap",
      entity: "system",
      entityId: "sprint-1",
      after: { adminEmail, permissions: permissions.map(([k]) => k) },
    },
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
