import { prisma } from "../src/index";

async function main() {
  await prisma.storeSetting.upsert({
    where: { key: "store.bootstrap" },
    update: { value: { ok: true } },
    create: { key: "store.bootstrap", value: { ok: true } },
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
