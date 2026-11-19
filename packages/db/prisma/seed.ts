import { createHash, randomBytes, scryptSync } from "node:crypto";

import { createPrismaClient } from "../src/index";

const prisma = createPrismaClient();

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
  ["cms:read", "Read CMS/pages in admin"],
  ["cms:write", "Manage CMS/pages"],
  ["media:read", "Read media assets"],
  ["media:write", "Manage media assets"],
  ["inventory:read", "Read inventory/warehouses/stock"],
  ["inventory:write", "Manage inventory/warehouses/stock"],
  ["orders:read", "Read orders/returns/invoices"],
  ["orders:write", "Manage orders/returns/invoices/refunds"],
  ["crm:read", "Read CRM customers/segments/reviews"],
  ["crm:write", "Manage CRM customers/segments/reviews/marketing"],
] as const;

const categories = [
  { slug: "women", name: "زنانه", image: "/media/categories/women.jpg", children: [
    { slug: "women-outerwear", name: "مانتو و پالتو", image: "/media/categories/outerwear.jpg" },
    { slug: "women-dresses", name: "پیراهن و بلوز", image: "/media/categories/dresses.jpg" },
    { slug: "women-bottoms", name: "شلوار و دامن", image: "/media/categories/bottoms.jpg" },
  ] },
  { slug: "men", name: "مردانه", image: "/media/categories/men.jpg", children: [
    { slug: "men-outerwear", name: "کت و پالتو", image: "/media/categories/men-coats.jpg" },
    { slug: "men-shirts", name: "پیراهن", image: "/media/categories/shirts.jpg" },
    { slug: "men-trousers", name: "شلوار", image: "/media/categories/trousers.jpg" },
  ] },
  { slug: "accessories", name: "اکسسوری", image: "/media/categories/accessories.jpg", children: [
    { slug: "bags", name: "کیف", image: "/media/categories/bags.jpg" },
    { slug: "shoes", name: "کفش", image: "/media/categories/shoes.jpg" },
    { slug: "scarves", name: "شال و روسری", image: "/media/categories/scarves.jpg" },
  ] },
] as const;

type ProductSeed = {
  slug: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  compareAt?: number;
  image: string;
  gallery?: string[];
  stock: number;
  short: string;
  description: string;
  featured?: boolean;
  isNew?: boolean;
  bestSeller?: boolean;
  color: string;
  sizes: string[];
};

const products: ProductSeed[] = [
  {
    slug: "wool-wrap-coat",
    name: "پالتو پشمی کمربنددار",
    brand: "AGHACI",
    category: "women-outerwear",
    price: 6_850_000,
    compareAt: 7_900_000,
    image: "/media/products/wool-coat.jpg",
    gallery: ["/media/products/wool-coat.jpg", "/media/products/coat-detail.jpg"],
    stock: 18,
    short: "پالتوی پشمی با خط‌های مینیمال، مناسب روزهای سرد شهری.",
    description:
      "پالتوی بلند از پشم مرینو با آستر ابریشمی و کمربند پارچه‌ای. برش صاف و یقه انگلیسی، همراه با دو جیب داخلی. تولید محدود در کارگاه تهران.",
    featured: true,
    bestSeller: true,
    color: "کرم",
    sizes: ["S", "M", "L"],
  },
  {
    slug: "cashmere-crewneck",
    name: "پلیور کشمیر یقه‌گرد",
    brand: "AGHACI",
    category: "women-outerwear",
    price: 4_290_000,
    image: "/media/products/cashmere.jpg",
    stock: 26,
    short: "کشمیر خالص با بافت نرم و گرمای بالا.",
    description:
      "پلیور کشمیر ۱۰۰٪ با بافت ریز و یقه گرد. سبک، بدون خارش و مناسب استفاده روزمره. رنگ‌بندی خنثی برای ست کردن آسان.",
    featured: true,
    isNew: true,
    color: "شکلاتی",
    sizes: ["S", "M", "L", "XL"],
  },
  {
    slug: "silk-slip-dress",
    name: "پیراهن ابریشمی اسلیپ",
    brand: "Noor",
    category: "women-dresses",
    price: 5_450_000,
    compareAt: 6_200_000,
    image: "/media/products/silk-dress.jpg",
    stock: 12,
    short: "پیراهن ابریشم با درپینگ روان و برش اریب.",
    description:
      "پیراهن اسلیپ از ابریشم ساتن با بندهای قابل تنظیم. برش اریب که فرم بدن را دنبال می‌کند؛ مناسب مهمانی و رویدادهای شب.",
    featured: true,
    isNew: true,
    bestSeller: true,
    color: "زمردی",
    sizes: ["S", "M", "L"],
  },
  {
    slug: "pleated-midi-skirt",
    name: "دامن پلیسه میدی",
    brand: "Noor",
    category: "women-bottoms",
    price: 2_950_000,
    image: "/media/products/pleated-skirt.jpg",
    stock: 30,
    short: "دامن پلیسه با حرکت نرم و کمر کشی.",
    description: "دامن پلیسه میدی از پارچه سبک با آستر. کمر کشی راحت و پلیسه‌های یکنواخت که در حرکت باز می‌شوند.",
    isNew: true,
    color: "زیتونی",
    sizes: ["S", "M", "L"],
  },
  {
    slug: "tailored-wool-blazer",
    name: "کت پشمی دو دکمه",
    brand: "AGHACI",
    category: "men-outerwear",
    price: 8_200_000,
    compareAt: 9_400_000,
    image: "/media/products/blazer.jpg",
    stock: 9,
    short: "کت ساختارمند با پارچه پشم و کشمیر.",
    description:
      "کت تک‌چاک با ساختار نیمه‌آستر، پارچه پشم-کشمیر و دکمه‌های شاخ طبیعی. برش مدرن با شانه‌های نرم.",
    featured: true,
    bestSeller: true,
    color: "سرمه‌ای",
    sizes: ["48", "50", "52", "54"],
  },
  {
    slug: "linen-camp-shirt",
    name: "پیراهن کتان یقه‌آرسی",
    brand: "AGHACI",
    category: "men-shirts",
    price: 1_890_000,
    image: "/media/products/linen-shirt.jpg",
    stock: 42,
    short: "کتان شسته‌شده با یقه باز و دوخت تمیز.",
    description: "پیراهن کتان ۱۰۰٪ با تکنیک شست‌وشوی نرم. یقه آرام، برش ریلکس و مناسب آب‌وهوای گرم.",
    isNew: true,
    color: "سفید",
    sizes: ["S", "M", "L", "XL"],
  },
  {
    slug: "wide-leg-trousers",
    name: "شلوار پارچه‌ای دم‌پا گشاد",
    brand: "Noor",
    category: "men-trousers",
    price: 2_450_000,
    image: "/media/products/trousers.jpg",
    stock: 22,
    short: "شلوار پارچه‌ای با کمر تنظیم‌شو.",
    description: "شلوار دم‌پا گشاد از پارچه توییل با کشش کم. کمر تنظیم‌شو با بند و جیب‌های مورب.",
    color: "خاکی",
    sizes: ["30", "32", "34", "36"],
  },
  {
    slug: "denim-trucker-jacket",
    name: "کاپشن جین تراکر",
    brand: "Noor",
    category: "men-outerwear",
    price: 3_650_000,
    image: "/media/products/denim-jacket.jpg",
    stock: 15,
    short: "جین سنگین با فرچه‌کاری دستی.",
    description: "کاپشن جین ۱۲ اونس با فرچه‌کاری دستی و دوخت دوتایی. ساختار کلاسیک تراکر با جیب سینه.",
    bestSeller: true,
    color: "آبی روشن",
    sizes: ["S", "M", "L", "XL"],
  },
  {
    slug: "leather-tote-bag",
    name: "کیف چرمی توت دسته‌بلند",
    brand: "Atelier",
    category: "bags",
    price: 4_950_000,
    compareAt: 5_800_000,
    image: "/media/products/leather-bag.jpg",
    stock: 11,
    short: "چرم طبیعی گاوی با دوخت دستی.",
    description:
      "کیف توت از چرم طبیعی با دباغی گیاهی، آستر پارچه‌ای و جیب داخلی. دسته‌ها با دوخت دستی تقویت شده‌اند.",
    featured: true,
    color: "قهوه‌ای",
    sizes: ["ONE"],
  },
  {
    slug: "leather-chelsea-boots",
    name: "بوت چلسی چرم",
    brand: "Atelier",
    category: "shoes",
    price: 5_200_000,
    image: "/media/products/boots.jpg",
    stock: 14,
    short: "بوت چلسی با زیره چرمی و کش کنار.",
    description: "بوت چلسی از چرم گاوی با زیره ضدآب و کش کناری. رویه نرم که با پوشیدن فرم پا را می‌گیرد.",
    isNew: true,
    color: "مشکی",
    sizes: ["38", "39", "40", "41", "42"],
  },
  {
    slug: "silk-square-scarf",
    name: "شال ابریشمی مربعی",
    brand: "Atelier",
    category: "scarves",
    price: 1_250_000,
    image: "/media/products/scarf.jpg",
    stock: 38,
    short: "ابریشم ۹۰×۹۰ با طرح دست‌نویس.",
    description: "شال ابریشم مربعی با لبه دست‌دوز و طرح اختصاصی فصل. بسته‌بندی هدیه دارد.",
    color: "طرح‌دار",
    sizes: ["90×90"],
  },
  {
    slug: "knit-cardigan",
    name: "کاردیگان بافت درشت",
    brand: "AGHACI",
    category: "women-outerwear",
    price: 3_290_000,
    image: "/media/products/cardigan.jpg",
    stock: 20,
    short: "بافت درشت با دکمه‌های چوبی.",
    description: "کاردیگان بافت درشت از پشم مرینو با دکمه‌های چوب طبیعی. برش اورسایز و جیب‌های بزرگ.",
    isNew: true,
    color: "شیری",
    sizes: ["S", "M", "L"],
  },
];

const colorValues = ["مشکی", "سفید", "سرمه‌ای", "کرم", "شکلاتی", "زمردی", "زیتونی", "خاکی", "قهوه‌ای", "شیری", "آبی روشن", "طرح‌دار"];

async function seedUsers() {
  const adminEmail = process.env.ADMIN_BOOTSTRAP_EMAIL ?? "admin@aghaci.local";
  const adminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "Admin@12345";
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { isAdmin: true, status: "ACTIVE", emailVerified: new Date() },
    create: {
      email: adminEmail,
      passwordHash: hashPassword(adminPassword),
      firstName: "مدیر",
      lastName: "فروشگاه",
      isAdmin: true,
      status: "ACTIVE",
      emailVerified: new Date(),
    },
  });

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
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id },
  });

  const customers = [
    { email: "sara@example.com", firstName: "سارا", lastName: "احمدی", phone: "09121234567", city: "تهران" },
    { email: "reza@example.com", firstName: "رضا", lastName: "کریمی", phone: "09127654321", city: "اصفهان" },
    { email: "mina@example.com", firstName: "مینا", lastName: "شریفی", phone: "09351112233", city: "شیراز" },
  ];

  const created = [];
  for (const customer of customers) {
    const user = await prisma.user.upsert({
      where: { email: customer.email },
      update: {},
      create: {
        email: customer.email,
        passwordHash: hashPassword("Customer@123"),
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        status: "ACTIVE",
        emailVerified: new Date(),
      },
    });
    await prisma.customerProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, marketingOptIn: true, smsOptIn: false },
    });
    await prisma.customerAddress.upsert({
      where: { id: `addr-${user.id}` },
      update: {},
      create: {
        id: `addr-${user.id}`,
        userId: user.id,
        title: "خانه",
        fullName: `${customer.firstName} ${customer.lastName}`,
        phone: customer.phone,
        country: "ایران",
        province: customer.city,
        city: customer.city,
        postalCode: "1234567890",
        address1: "خیابان ولیعصر، پلاک ۱۲",
        isDefault: true,
      },
    });
    created.push(user);
  }

  return { admin, customers: created };
}

async function seedCatalog() {
  const color = await prisma.attribute.upsert({
    where: { slug: "color" },
    update: { name: "رنگ" },
    create: { name: "رنگ", slug: "color", sortOrder: 1 },
  });
  const size = await prisma.attribute.upsert({
    where: { slug: "size" },
    update: { name: "سایز" },
    create: { name: "سایز", slug: "size", sortOrder: 2 },
  });

  for (const [index, value] of colorValues.entries()) {
    await prisma.attributeValue.upsert({
      where: { attributeId_slug: { attributeId: color.id, slug: `color-${index}` } },
      update: { value },
      create: { attributeId: color.id, slug: `color-${index}`, value, sortOrder: index, meta: { hex: "#" + (0x111111 + index * 0x101010).toString(16).padStart(6, "0").slice(0, 6) } },
    });
  }

  const sizeValues = ["S", "M", "L", "XL", "48", "50", "52", "54", "30", "32", "34", "36", "38", "39", "40", "41", "42", "ONE", "90×90"];
  for (const [index, value] of sizeValues.entries()) {
    await prisma.attributeValue.upsert({
      where: { attributeId_slug: { attributeId: size.id, slug: `size-${value.toLowerCase().replace(/[^a-z0-9]/g, "")}` } },
      update: { value },
      create: {
        attributeId: size.id,
        slug: `size-${value.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
        value,
        sortOrder: index,
      },
    });
  }
  const sizeRows = await prisma.attributeValue.findMany({ where: { attributeId: size.id } });
  const sizeMap = new Map(sizeRows.map((row) => [row.value, row.id]));

  // Categories
  const categoryIds = new Map<string, string>();
  for (const [index, parent] of categories.entries()) {
    const parentRow = await prisma.category.upsert({
      where: { slug: parent.slug },
      update: { name: parent.name, imageUrl: parent.image, sortOrder: index },
      create: {
        slug: parent.slug,
        name: parent.name,
        imageUrl: parent.image,
        sortOrder: index,
        description: `مجموعه ${parent.name} آگاهی`,
        seoTitle: `${parent.name} | آگاهی`,
        seoDescription: `خرید ${parent.name} با طراحی مینیمال و پارچه‌های طبیعی.`,
      },
    });
    categoryIds.set(parent.slug, parentRow.id);
    for (const [childIndex, child] of parent.children.entries()) {
      const childRow = await prisma.category.upsert({
        where: { slug: child.slug },
        update: { name: child.name, imageUrl: child.image, parentId: parentRow.id, sortOrder: childIndex },
        create: {
          slug: child.slug,
          name: child.name,
          imageUrl: child.image,
          parentId: parentRow.id,
          sortOrder: childIndex,
          description: `${child.name} — کالکشن ${parent.name}`,
        },
      });
      categoryIds.set(child.slug, childRow.id);
    }
  }

  // Products
  const productIds = new Map<string, string>();
  for (const [index, item] of products.entries()) {
    const categoryId = categoryIds.get(item.category);
    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        brand: item.brand,
        basePrice: item.price,
        compareAtPrice: item.compareAt ?? null,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
      create: {
        slug: item.slug,
        name: item.name,
        brand: item.brand,
        description: item.description,
        shortDescription: item.short,
        type: item.sizes.length > 1 ? "VARIABLE" : "SIMPLE",
        status: "PUBLISHED",
        publishedAt: new Date(Date.now() - index * 86_400_000),
        sku: `AGH-${1000 + index}`,
        basePrice: item.price,
        compareAtPrice: item.compareAt ?? null,
        costPrice: Math.round(item.price * 0.55),
        stockQuantity: item.stock,
        lowStockThreshold: 5,
        seo: {
          create: {
            metaTitle: `${item.name} | آگاهی`,
            metaDescription: item.short,
          },
        },
        categories: categoryId ? { create: [{ categoryId }] } : undefined,
        images: {
          create: (item.gallery ?? [item.image]).map((url, imageIndex) => ({
            url,
            alt: item.name,
            sortOrder: imageIndex,
            isPrimary: imageIndex === 0,
          })),
        },
        variants: {
          create: item.sizes.map((value, variantIndex) => ({
            sku: `AGH-${1000 + index}-${variantIndex + 1}`,
            title: value,
            price: item.price,
            stockQuantity: Math.max(2, Math.round(item.stock / item.sizes.length)),
            isActive: true,
            sortOrder: variantIndex,
            imageUrl: item.image,
            attributes: sizeMap.has(value)
              ? { create: [{ attributeValueId: sizeMap.get(value)! }] }
              : undefined,
          })),
        },
      },
    });
    productIds.set(item.slug, product.id);

    const variantRows = await prisma.productVariant.findMany({ where: { productId: product.id } });
    const mainWarehouse = await prisma.warehouse.findUnique({ where: { code: "MAIN" } });
    if (mainWarehouse) {
      for (const variant of variantRows) {
        await prisma.inventoryItem.upsert({
          where: { warehouseId_productId_variantId: { warehouseId: mainWarehouse.id, productId: product.id, variantId: variant.id } },
          update: { quantity: variant.stockQuantity },
          create: { warehouseId: mainWarehouse.id, productId: product.id, variantId: variant.id, quantity: variant.stockQuantity, lowStock: 5 },
        });
      }
    }
  }

  // Related products (curated pairings)
  const productList = [...productIds.entries()];
  for (let i = 0; i < productList.length; i += 1) {
    const current = productList[i]!;
    const related = productList[(i + 1) % productList.length]!;
    const complementary = productList[(i + 5) % productList.length]!;
    await prisma.productRelation.upsert({
      where: { fromProductId_toProductId_type: { fromProductId: current[1], toProductId: related[1], type: "RELATED" } },
      update: {},
      create: { fromProductId: current[1], toProductId: related[1], type: "RELATED" },
    });
    await prisma.productRelation.upsert({
      where: { fromProductId_toProductId_type: { fromProductId: current[1], toProductId: complementary[1], type: "COMPLEMENTARY" } },
      update: {},
      create: { fromProductId: current[1], toProductId: complementary[1], type: "COMPLEMENTARY" },
    });
  }

  return { productIds, categoryIds };
}

async function seedOrders(customerIds: string[], productIds: Map<string, string>) {
  const addressRows = await prisma.customerAddress.findMany();
  const slugEntries = [...productIds.entries()];
  const statuses = [
    { status: "DELIVERED", payment: "PAID", daysAgo: 26 },
    { status: "SHIPPED", payment: "PAID", daysAgo: 12 },
    { status: "PROCESSING", payment: "PAID", daysAgo: 6 },
    { status: "AWAITING_PAYMENT", payment: "PENDING", daysAgo: 2 },
    { status: "DELIVERED", payment: "PAID", daysAgo: 40 },
    { status: "PAID", payment: "PAID", daysAgo: 1 },
  ] as const;

  let totalRevenue = 0;
  for (const [index, config] of statuses.entries()) {
    const number = `AGH-${1001 + index}`;
    const userId = customerIds[index % customerIds.length]!;
    const address = addressRows.find((row) => row.userId === userId);
    const items = [slugEntries[index % slugEntries.length]!, slugEntries[(index + 3) % slugEntries.length]!];
    const productRows = await prisma.product.findMany({ where: { id: { in: items.map(([, id]) => id) } }, include: { variants: true } });

    const orderItems = productRows.map((product, itemIndex) => {
      const variant = product.variants[0];
      const unitPrice = Number(product.basePrice ?? 0);
      const quantity = itemIndex === 0 ? 1 : 2;
      return {
        productId: product.id,
        variantId: variant?.id,
        name: product.name,
        sku: variant?.sku ?? product.sku,
        variantTitle: variant?.title,
        quantity,
        unitPrice,
        totalPrice: unitPrice * quantity,
        imageUrl: variant?.imageUrl,
      };
    });

    const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const shipping = subtotal > 5_000_000 ? 0 : 89_000;
    const total = subtotal + shipping;
    const placedAt = new Date(Date.now() - config.daysAgo * 86_400_000);
    if (config.payment === "PAID") totalRevenue += total;

    const order = await prisma.order.upsert({
      where: { number },
      update: { status: config.status, paymentStatus: config.payment },
      create: {
        number,
        userId,
        email: (await prisma.user.findUnique({ where: { id: userId } }))!.email,
        status: config.status,
        paymentStatus: config.payment,
        currency: "TOMAN",
        subtotal,
        shippingAmount: shipping,
        total,
        placedAt,
        createdAt: placedAt,
        addressId: address?.id,
        shippingAddress: address
          ? {
              fullName: address.fullName,
              phone: address.phone,
              country: address.country,
              province: address.province,
              city: address.city,
              address1: address.address1,
              postalCode: address.postalCode,
            }
          : undefined,
        items: { create: orderItems },
        payments: {
          create: {
            provider: "SANDBOX",
            status: config.payment as "PAID" | "PENDING",
            amount: total,
            currency: "TOMAN",
            reference: `SBX-${number}`,
            paidAt: config.payment === "PAID" ? placedAt : null,
          },
        },
        statusHistory: {
          create: [
            { fromStatus: null, toStatus: "PENDING", toPayment: "PENDING", note: "سفارش ثبت شد", createdAt: placedAt },
            {
              fromStatus: "PENDING",
              toStatus: config.status,
              fromPayment: "PENDING",
              toPayment: config.payment,
              note: "به‌روزرسانی توسط تیم عملیات",
              createdAt: new Date(placedAt.getTime() + 3_600_000),
            },
          ],
        },
      },
    });

    if (config.status === "SHIPPED" || config.status === "DELIVERED") {
      const existingShipment = await prisma.shipment.findFirst({ where: { orderId: order.id } });
      if (!existingShipment) {
        await prisma.shipment.create({
          data: {
            orderId: order.id,
            carrier: "پست پیشتاز",
            service: "اکسپرس",
            trackingNumber: `IR${900000000 + index}`,
            status: config.status === "DELIVERED" ? "DELIVERED" : "SHIPPED",
            shippedAt: new Date(placedAt.getTime() + 86_400_000),
            deliveredAt: config.status === "DELIVERED" ? new Date(placedAt.getTime() + 3 * 86_400_000) : null,
          },
        });
      }
    }
  }

  // Update customer lifetime value snapshots
  for (const userId of customerIds) {
    const orders = await prisma.order.findMany({ where: { userId, paymentStatus: "PAID" } });
    await prisma.customerProfile.update({
      where: { userId },
      data: {
        ordersCount: orders.length,
        lifetimeValue: orders.reduce((sum, order) => sum + Number(order.total), 0),
        lastOrderAt: orders[0]?.placedAt ?? null,
      },
    });
  }

  return totalRevenue;
}

async function seedMarketing() {
  await prisma.discountCode.upsert({
    where: { code: "WELCOME10" },
    update: { isActive: true },
    create: {
      code: "WELCOME10",
      description: "تخفیف ۱۰٪ اولین خرید",
      type: "PERCENT",
      value: 10,
      minOrderAmount: 1_000_000,
      maxUses: 500,
      startsAt: new Date(Date.now() - 10 * 86_400_000),
      endsAt: new Date(Date.now() + 60 * 86_400_000),
    },
  });
  await prisma.discountCode.upsert({
    where: { code: "FREE-SHIP" },
    update: { isActive: true },
    create: {
      code: "FREE-SHIP",
      description: "ارسال رایگان بدون سقف",
      type: "FREE_SHIPPING",
      value: 0,
      minOrderAmount: 1_500_000,
      isActive: true,
    },
  });
  await prisma.discountCode.upsert({
    where: { code: "NOWRUZ" },
    update: { isActive: true },
    create: {
      code: "NOWRUZ",
      description: "تخفیف نوروزی ۱٫۰۰۰٫۰۰۰ تومانی",
      type: "FIXED_AMOUNT",
      value: 1_000_000,
      minOrderAmount: 5_000_000,
      maxUses: 200,
    },
  });

  await prisma.giftCard.upsert({
    where: { code: "GIFT-AGH-5000" },
    update: {},
    create: { code: "GIFT-AGH-5000", initialValue: 5_000_000, balance: 5_000_000, currency: "TOMAN", expiresAt: new Date(Date.now() + 180 * 86_400_000) },
  });

  const segment = await prisma.customerSegment.upsert({
    where: { slug: "vip" },
    update: {},
    create: { name: "مشتریان VIP", slug: "vip", description: "بیش از دو خرید موفق", isActive: true },
  });
  const campaign = await prisma.campaign.upsert({
    where: { slug: "autumn-newsletter" },
    update: {},
    create: {
      name: "خبرنامه کالکشن پاییز",
      slug: "autumn-newsletter",
      description: "معرفی کالکشن جدید پاییز برای اعضای خبرنامه",
      status: "ACTIVE",
      channel: "EMAIL",
      segmentId: segment.id,
      startsAt: new Date(Date.now() - 3 * 86_400_000),
    },
  });

  const products = await prisma.product.findMany({ take: 4 });
  for (const product of products) {
    await prisma.campaignProduct.upsert({
      where: { campaignId_productId: { campaignId: campaign.id, productId: product.id } },
      update: {},
      create: { campaignId: campaign.id, productId: product.id },
    });
  }
}

async function seedReviews() {
  const productRows = await prisma.product.findMany({ take: 6 });
  const users = await prisma.user.findMany({ where: { isAdmin: false } });
  const reviews = [
    { rating: 5, title: "کیفیت عالی", body: "پارچه واقعاً خوبه و اندازه‌ها دقیق. حتماً بازم خرید می‌کنم." },
    { rating: 4, title: "ارزش خرید بالا", body: "رنگش کمی تیره‌تر از عکسه ولی کیفیت دوخت بی‌نظیره." },
    { rating: 5, title: "دقیقاً همون چیزی که می‌خواستم", body: "بسته‌بندی شیک و ارسال سریع. ممنون از تیم آگاهی." },
  ];
  for (const [index, product] of productRows.entries()) {
    const existing = await prisma.productReview.findFirst({ where: { productId: product.id } });
    if (existing) continue;
    const review = reviews[index % reviews.length]!;
    await prisma.productReview.create({
      data: {
        productId: product.id,
        userId: users[index % users.length]?.id,
        authorName: users[index % users.length]?.firstName ?? "مهمان",
        rating: review.rating,
        title: review.title,
        body: review.body,
        status: "APPROVED",
        isVerified: true,
        moderatedAt: new Date(),
      },
    });
    if (index === 0) {
      await prisma.productReview.create({
        data: { productId: product.id, rating: 3, title: "منتظر بررسی", body: "این نظر در انتظار تأیید است.", status: "PENDING" },
      });
    }
  }

  const wishlistUser = users[0];
  if (wishlistUser) {
    for (const product of productRows.slice(0, 3)) {
      await prisma.wishlistItem.upsert({
        where: { userId_productId: { userId: wishlistUser.id, productId: product.id } },
        update: {},
        create: { userId: wishlistUser.id, productId: product.id },
      });
    }
  }
}

async function seedCms() {
  const homeSections = [
    {
      type: "hero",
      config: {
        eyebrow: "کالکشن پاییز ۱۴۰۴",
        title: "پوشاکی که با تو نفس می‌کشد",
        subtitle: "پارچه‌های طبیعی، برش‌های آرام و دوخت ماندگار. کالکشن جدید آگاهی حالا در دسترس است.",
        ctaLabel: "کشف کالکشن",
        ctaHref: "/products",
        secondaryLabel: "داستان برند",
        secondaryHref: "/about",
        image: "/media/hero/hero.jpg",
        align: "start",
      },
    },
    {
      type: "featured_categories",
      config: { title: "دسته‌بندی‌ها", subtitle: "مسیر سریع‌تر به استایل خودت", limit: 3 },
    },
    {
      type: "best_sellers",
      config: { title: "پرفروش‌های این فصل", subtitle: "انتخاب‌های محبوب مشتریان", limit: 4, columns: 4 },
    },
    {
      type: "promo_banner",
      config: {
        eyebrow: "پیشنهاد ویژه",
        title: "تا ۳۰٪ تخفیف روی کالکشن پاییز",
        subtitle: "کد WELCOME10 را در سبد خرید وارد کن و ۱۰٪ دیگر هم بگیر.",
        ctaLabel: "خرید با تخفیف",
        ctaHref: "/products?sort=discount",
        image: "/media/hero/banner.jpg",
      },
    },
    {
      type: "new_arrivals",
      config: { title: "تازه رسیده‌ها", subtitle: "آخرین اضافه‌شده‌ها به کالکشن", limit: 4, columns: 4 },
    },
    {
      type: "image_text",
      config: {
        eyebrow: "درباره آگاهی",
        title: "ساخته‌شده برای ماندن",
        body: "از سال ۱۳۹۶ با هدف تولید پوشاک کم‌تعداد و باکیفیت شروع کردیم. هر قطعه در کارگاه‌های کوچک تهران دوخته می‌شود و پارچه‌ها از تأمین‌کنندگان دارای گواهی انتخاب می‌شوند.",
        ctaLabel: "بیشتر بدانید",
        ctaHref: "/about",
        image: "/media/hero/atelier.jpg",
        align: "image-left",
      },
    },
    {
      type: "testimonials",
      config: {
        title: "از زبان مشتریان",
        items: [
          { name: "نیلوفر", role: "تهران", quote: "کیفیت پارچه و دوخت واقعاً فراتر از انتظارم بود." },
          { name: "امیر", role: "اصفهان", quote: "ارسال سریع و بسته‌بندی خیلی شیک. سایزبندی دقیق است." },
          { name: "مریم", role: "شیراز", quote: "پشتیبانی خیلی خوب جواب داد و تعویض سایز بدون دردسر انجام شد." },
        ],
      },
    },
    {
      type: "faq",
      config: {
        title: "سؤالات پرتکرار",
        items: [
          { question: "ارسال چقدر طول می‌کشد؟", answer: "تهران ۲۴ تا ۴۸ ساعت، سایر شهرها ۲ تا ۴ روز کاری." },
          { question: "امکان تعویض سایز وجود دارد؟", answer: "تا ۷ روز پس از دریافت، در صورت نداشتن برچسب و استفاده." },
          { question: "پرداخت در محل فعال است؟", answer: "برای سفارش‌های زیر ۵ میلیون تومان در تهران فعال است." },
        ],
      },
    },
    {
      type: "newsletter",
      config: { title: "اولین نفر باش", subtitle: "از کالکشن‌های محدود و تخفیف‌های ویژه باخبر شو." },
    },
  ];

  const home = await prisma.page.upsert({
    where: { slug: "home" },
    update: { title: "صفحه اصلی", type: "HOME", status: "PUBLISHED", metaTitle: "آگاهی | پوشاک مینیمال ایرانی", metaDescription: "خرید پوشاک با طراحی مینیمال، پارچه طبیعی و دوخت ماندگار." },
    create: {
      title: "صفحه اصلی",
      slug: "home",
      type: "HOME",
      status: "PUBLISHED",
      publishedAt: new Date(),
      metaTitle: "آگاهی | پوشاک مینیمال ایرانی",
      metaDescription: "خرید پوشاک با طراحی مینیمال، پارچه طبیعی و دوخت ماندگار.",
    },
  });

  const existingVersion = await prisma.pageVersion.findFirst({ where: { pageId: home.id, isPublished: true } });
  if (!existingVersion) {
    const version = await prisma.pageVersion.create({
      data: {
        pageId: home.id,
        version: 1,
        label: "کالکشن پاییز",
        isPublished: true,
        sections: {
          create: homeSections.map((section, index) => ({
            type: section.type,
            sortOrder: index,
            isVisible: true,
            config: section.config,
          })),
        },
      },
    });
    await prisma.page.update({ where: { id: home.id }, data: { publishedVersionId: version.id, draftVersionId: version.id } });
  }

  // Static + blog pages
  const staticPages = [
    {
      slug: "about",
      title: "درباره آگاهی",
      type: "STATIC" as const,
      sections: [
        { type: "rich_text", config: { title: "ما کی هستیم", body: "آگاهی یک برند پوشاک مستقل ایرانی است که از ۱۳۹۶ روی طراحی مینیمال و تولید محدود تمرکز دارد." } },
        { type: "image_text", config: { title: "تولید کوچک، کیفیت بالا", body: "هر کالکشن در تیراژ محدود تولید می‌شود تا کیفیت دوخت و پارچه در بالاترین سطح بماند.", image: "/media/hero/atelier.jpg", align: "image-right" } },
      ],
    },
    {
      slug: "shipping-and-returns",
      title: "ارسال و بازگشت",
      type: "STATIC" as const,
      sections: [{ type: "rich_text", config: { title: "ارسال", body: "سفارش‌های تهران ۲۴ تا ۴۸ ساعته و سایر شهرها ۲ تا ۴ روز کاری به دست شما می‌رسد. ارسال سفارش‌های بالای ۵ میلیون تومان رایگان است." } }],
    },
    {
      slug: "blog-autumn-collection",
      title: "راهنمای ست کردن کالکشن پاییز",
      type: "BLOG" as const,
      sections: [{ type: "rich_text", config: { title: "سه ترکیب برای پاییز", body: "پالتوی پشمی کرم را با پلیور کشمیر شکلاتی و شلوار پارچه‌ای خاکی ست کنید..." } }],
    },
  ];

  for (const page of staticPages) {
    const row = await prisma.page.upsert({
      where: { slug: page.slug },
      update: { title: page.title, status: "PUBLISHED" },
      create: {
        title: page.title,
        slug: page.slug,
        type: page.type,
        status: "PUBLISHED",
        publishedAt: new Date(),
        metaTitle: `${page.title} | آگاهی`,
      },
    });
    const version = await prisma.pageVersion.findFirst({ where: { pageId: row.id, isPublished: true } });
    if (!version) {
      const created = await prisma.pageVersion.create({
        data: {
          pageId: row.id,
          version: 1,
          isPublished: true,
          sections: { create: page.sections.map((section, index) => ({ type: section.type, sortOrder: index, config: section.config })) },
        },
      });
      await prisma.page.update({ where: { id: row.id }, data: { publishedVersionId: created.id, draftVersionId: created.id } });
    }
  }

  await prisma.globalLayout.upsert({
    where: { key: "default" },
    update: {
      header: {
        brand: "آگاهی",
        tagline: "پوشاک مینیمال",
        announcement: "ارسال رایگان برای سفارش‌های بالای ۵ میلیون تومان",
        links: [
          { label: "زنانه", href: "/categories/women" },
          { label: "مردانه", href: "/categories/men" },
          { label: "اکسسوری", href: "/categories/accessories" },
          { label: "داستان برند", href: "/about" },
        ],
      },
      footer: {
        about: "آگاهی، پوشاک مینیمال با تولید محدود و پارچه‌های طبیعی.",
        columns: [
          { title: "خرید", links: [{ label: "همه محصولات", href: "/products" }, { label: "زنانه", href: "/categories/women" }, { label: "مردانه", href: "/categories/men" }] },
          { title: "پشتیبانی", links: [{ label: "ارسال و بازگشت", href: "/shipping-and-returns" }, { label: "حساب من", href: "/account" }] },
        ],
        contact: { phone: "۰۲۱–۸۸۸۸۸۸۸۸", email: "hello@aghaci.local", address: "تهران، خیابان ولیعصر" },
      },
    },
    create: {
      key: "default",
      header: {
        brand: "آگاهی",
        tagline: "پوشاک مینیمال",
        announcement: "ارسال رایگان برای سفارش‌های بالای ۵ میلیون تومان",
        links: [
          { label: "زنانه", href: "/categories/women" },
          { label: "مردانه", href: "/categories/men" },
          { label: "اکسسوری", href: "/categories/accessories" },
          { label: "داستان برند", href: "/about" },
        ],
      },
      footer: {
        about: "آگاهی، پوشاک مینیمال با تولید محدود و پارچه‌های طبیعی.",
        columns: [
          { title: "خرید", links: [{ label: "همه محصولات", href: "/products" }, { label: "زنانه", href: "/categories/women" }, { label: "مردانه", href: "/categories/men" }] },
          { title: "پشتیبانی", links: [{ label: "ارسال و بازگشت", href: "/shipping-and-returns" }, { label: "حساب من", href: "/account" }] },
        ],
        contact: { phone: "۰۲۱–۸۸۸۸۸۸۸۸", email: "hello@aghaci.local", address: "تهران، خیابان ولیعصر" },
      },
    },
  });

  await prisma.navigationMenu.upsert({
    where: { key: "main" },
    update: {},
    create: {
      key: "main",
      name: "منوی اصلی",
      items: {
        create: [
          { label: "زنانه", href: "/categories/women", sortOrder: 0 },
          { label: "مردانه", href: "/categories/men", sortOrder: 1 },
          { label: "اکسسوری", href: "/categories/accessories", sortOrder: 2 },
          { label: "ژورنال", href: "/blog-autumn-collection", sortOrder: 3 },
        ],
      },
    },
  });
}

async function seedSettings() {
  const settings = [
    ["store.name", { value: "آگاهی" }],
    ["store.tagline", { value: "پوشاک مینیمال ایرانی" }],
    ["store.currency", { value: "TOMAN" }],
    ["store.supportEmail", { value: "hello@aghaci.local" }],
    ["store.supportPhone", { value: "۰۲۱–۸۸۸۸۸۸۸۸" }],
    ["shipping.freeThreshold", { value: 5_000_000 }],
    ["shipping.standardRate", { value: 89_000 }],
    ["shipping.expressRate", { value: 149_000 }],
    ["tax.defaultRate", { value: 0 }],
    ["payments.provider", { value: "SANDBOX" }],
    ["theme.accent", { value: "#B4885B" }],
  ] as const;
  for (const [key, value] of settings) {
    await prisma.storeSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
}

async function main() {
  for (const [key, description] of permissions) {
    await prisma.permission.upsert({ where: { key }, update: { description }, create: { key, description } });
  }

  const { admin, customers } = await seedUsers();
  const { productIds } = await seedCatalog();
  await seedMarketing();
  await seedReviews();
  await seedCms();
  await seedSettings();
  const revenue = await seedOrders(
    customers.map((user) => user.id),
    productIds,
  );

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      actorEmail: admin.email,
      action: "seed.demo",
      entity: "system",
      entityId: "sprint-12",
      after: { products: productIds.size, revenue },
    },
  });

  const counts = await Promise.all([
    prisma.product.count(),
    prisma.category.count(),
    prisma.order.count(),
    prisma.page.count(),
    prisma.productReview.count(),
  ]);
  console.log(
    `✔ seed complete — products:${counts[0]} categories:${counts[1]} orders:${counts[2]} pages:${counts[3]} reviews:${counts[4]}`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
