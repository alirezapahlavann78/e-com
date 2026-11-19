import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async dashboard() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start14 = new Date(startOfToday);
    start14.setDate(start14.getDate() - 13);

    const start30 = new Date(startOfToday);
    start30.setDate(start30.getDate() - 29);

    const [ordersToday, totalCustomers, totalProducts, recentOrders, lowStockProducts, lowStockVariants, revenue14d, ordersByStatusRows, paidOrders30d, topProductRows] =
      await Promise.all([
        this.prisma.order.findMany({
          where: { createdAt: { gte: startOfToday } },
          select: { total: true },
        }),
        this.prisma.user.count(),
        this.prisma.product.count(),
        this.prisma.order.findMany({
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true, number: true, email: true, status: true, paymentStatus: true, total: true, createdAt: true,
            user: { select: { firstName: true, lastName: true } },
          },
        }),
        this.prisma.product.findMany({
          where: { trackInventory: true, stockQuantity: { lte: 5 } },
          orderBy: { stockQuantity: "asc" },
          take: 10,
          select: { id: true, sku: true, name: true, stockQuantity: true },
        }),
        this.prisma.productVariant.findMany({
          where: { stockQuantity: { lte: 5 } },
          orderBy: { stockQuantity: "asc" },
          take: 10,
          select: { id: true, sku: true, stockQuantity: true, product: { select: { name: true } } },
        }),
        this.prisma.order.findMany({
          where: { createdAt: { gte: start14 } },
          select: { createdAt: true, total: true },
        }),
        this.prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
        this.prisma.order.findMany({
          where: { createdAt: { gte: start30 }, paymentStatus: "PAID" },
          select: { total: true, status: true },
        }),
        this.prisma.orderItem.groupBy({
          by: ["name"],
          where: { order: { paymentStatus: "PAID" } },
          _sum: { totalPrice: true, quantity: true },
          orderBy: { _sum: { totalPrice: "desc" } },
          take: 5,
        }),
      ]);

    const num = (v: any) => Number(v ?? 0);
    const revenueToday = ordersToday.reduce((sum, o) => sum + num(o.total), 0);

    // bucket the 14 days
    const days: { date: string; revenue: number }[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(start14);
      d.setDate(d.getDate() + i);
      days.push({ date: d.toISOString().slice(0, 10), revenue: 0 });
    }
    for (const o of revenue14d) {
      const key = new Date(o.createdAt.getFullYear(), o.createdAt.getMonth(), o.createdAt.getDate()).toISOString().slice(0, 10);
      const day = days.find((d) => d.date === key);
      if (day) day.revenue += num(o.total);
    }

    const ordersByStatus: Record<string, number> = {};
    for (const row of ordersByStatusRows) ordersByStatus[row.status] = row._count._all;

    const lowStock = [
      ...lowStockProducts.map((p) => ({ id: p.id, sku: p.sku ?? p.id, name: p.name, stockQuantity: p.stockQuantity })),
      ...lowStockVariants.map((v) => ({ id: v.id, sku: v.sku, name: `${v.product.name}${v.sku ? ` (${v.sku})` : ""}`, stockQuantity: v.stockQuantity })),
    ]
      .sort((a, b) => a.stockQuantity - b.stockQuantity)
      .slice(0, 10);

    const revenue30d = paidOrders30d.reduce((sum, order) => sum + num(order.total), 0);
    const paidCount30d = paidOrders30d.length;

    return {
      revenue30d,
      orders30d: paidCount30d,
      averageOrderValue: paidCount30d ? Math.round(revenue30d / paidCount30d) : 0,
      topProducts: topProductRows.map((row) => ({
        name: row.name,
        revenue: num(row._sum.totalPrice),
        quantity: num(row._sum.quantity),
      })),
      revenueToday,
      revenue14d: days,
      ordersToday: ordersToday.length,
      ordersByStatus,
      totalCustomers,
      totalProducts,
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        number: o.number,
        email: o.email,
        status: o.status,
        paymentStatus: o.paymentStatus,
        total: num(o.total),
        createdAt: o.createdAt,
        customerName: [o.user?.firstName, o.user?.lastName].filter(Boolean).join(" ").trim() || null,
      })),
      lowStock,
    };
  }
}
