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
  ["catalog:read", "Read catalog data in admin"],
  ["catalog:write", "Manage catalog data"],
] as const;

async function main() {
  await prisma.storeSetting.upsert({
    where: { key: "store.bootstrap" },
    update: { value: { ok: true, sprint: 3 } },
    create: { key: "store.bootstrap", value: { ok: true, sprint: 3 } },
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
      entityId: "sprint-3",
      after: { adminEmail, permissions: permissions.map(([k]) => k) },
    },
  });

  const color = await prisma.attribute.upsert({ where: { slug: "color" }, update: { name: "رنگ" }, create: { name: "رنگ", slug: "color", sortOrder: 1 } });
  const size = await prisma.attribute.upsert({ where: { slug: "size" }, update: { name: "سایز" }, create: { name: "سایز", slug: "size", sortOrder: 2 } });
  for (const [slug, value, sortOrder] of [["black", "مشکی", 1], ["white", "سفید", 2], ["navy", "سرمه‌ای", 3]] as const) {
    await prisma.attributeValue.upsert({ where: { attributeId_slug: { attributeId: color.id, slug } }, update: { value, sortOrder }, create: { attributeId: color.id, slug, value, sortOrder } });
  }
  for (const [slug, value, sortOrder] of [["s", "S", 1], ["m", "M", 2], ["l", "L", 3], ["xl", "XL", 4]] as const) {
    await prisma.attributeValue.upsert({ where: { attributeId_slug: { attributeId: size.id, slug } }, update: { value, sortOrder }, create: { attributeId: size.id, slug, value, sortOrder } });
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
