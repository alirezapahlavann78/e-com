import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

type Range = { from: Date; to: Date };

const DAY = 86_400_000;

function parseRange(from?: string, to?: string, defaultDays = 30): Range {
  const end = to ? new Date(to) : new Date();
  end.setHours(23, 59, 59, 999);
  const start = from ? new Date(from) : new Date(end.getTime() - (defaultDays - 1) * DAY);
  start.setHours(0, 0, 0, 0);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new Error("Invalid date range");
  if (start > end) throw new Error("`from` must be before `to`");
  return { from: start, to: end };
}

const num = (value: unknown) => Number(value ?? 0);
const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** Escapes a CSV cell and keeps Persian text readable in Excel. */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = value instanceof Date ? value.toISOString() : String(value);
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvCell).join(","), ...rows.map((row) => row.map(csvCell).join(","))];
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async sales(from?: string, to?: string) {
    const { from: start, to: end } = parseRange(from, to);
    const where = { createdAt: { gte: start, lte: end } };

    const [orders, paid, refunds, newCustomers, topProducts, topCustomers] = await Promise.all([
      this.prisma.order.findMany({
        where,
        select: { id: true, status: true, paymentStatus: true, total: true, subtotal: true, shippingAmount: true, discountAmount: true, taxAmount: true, createdAt: true, email: true },
      }),
      this.prisma.order.findMany({
        where: { ...where, paymentStatus: "PAID" },
        select: { total: true, createdAt: true },
      }),
      this.prisma.refund.aggregate({ where: { createdAt: where.createdAt }, _sum: { amount: true }, _count: { _all: true } }),
      this.prisma.user.count({ where: { createdAt: where.createdAt } }),
      this.prisma.orderItem.groupBy({
        by: ["name"],
        where: { order: { createdAt: where.createdAt, paymentStatus: "PAID" } },
        _sum: { totalPrice: true, quantity: true },
        orderBy: { _sum: { totalPrice: "desc" } },
        take: 10,
      }),
      this.prisma.order.groupBy({
        by: ["email"],
        where: { ...where, paymentStatus: "PAID" },
        _sum: { total: true },
        _count: { _all: true },
        orderBy: { _sum: { total: "desc" } },
        take: 10,
      }),
    ]);

    // one bucket per day, including days without orders
    const days: { date: string; revenue: number; orders: number }[] = [];
    for (let cursor = new Date(start); cursor <= end; cursor = new Date(cursor.getTime() + DAY)) {
      days.push({ date: dayKey(cursor), revenue: 0, orders: 0 });
    }
    const buckets = new Map(days.map((day) => [day.date, day]));
    for (const order of paid) {
      const bucket = buckets.get(dayKey(new Date(order.createdAt)));
      if (bucket) {
        bucket.revenue += num(order.total);
        bucket.orders += 1;
      }
    }

    const byStatus: Record<string, number> = {};
    const byPayment: Record<string, number> = {};
    for (const order of orders) {
      byStatus[order.status] = (byStatus[order.status] ?? 0) + 1;
      byPayment[order.paymentStatus] = (byPayment[order.paymentStatus] ?? 0) + 1;
    }

    const grossRevenue = paid.reduce((sum, order) => sum + num(order.total), 0);
    const shipped = orders.filter((order) => ["SHIPPED", "DELIVERED"].includes(order.status)).length;
    const cancelled = orders.filter((order) => order.status === "CANCELLED").length;

    return {
      range: { from: start.toISOString(), to: end.toISOString() },
      totals: {
        revenue: grossRevenue,
        paidOrders: paid.length,
        orders: orders.length,
        averageOrderValue: paid.length ? Math.round(grossRevenue / paid.length) : 0,
        refunds: num(refunds._sum.amount),
        refundCount: refunds._count._all,
        newCustomers,
        shipping: orders.reduce((sum, order) => sum + num(order.shippingAmount), 0),
        discount: orders.reduce((sum, order) => sum + num(order.discountAmount), 0),
        tax: orders.reduce((sum, order) => sum + num(order.taxAmount), 0),
        shipped,
        cancelled,
        conversionNote: "conversion is not tracked yet (no analytics events)",
      },
      days,
      byStatus,
      byPayment,
      topProducts: topProducts.map((row) => ({ name: row.name, revenue: num(row._sum.totalPrice), quantity: num(row._sum.quantity) })),
      topCustomers: topCustomers.map((row) => ({ email: row.email, revenue: num(row._sum.total), orders: row._count._all })),
    };
  }

  async exportCsv(dataset: string, from?: string, to?: string) {
    const { from: start, to: end } = parseRange(from, to);
    const where = { createdAt: { gte: start, lte: end } };

    if (dataset === "orders") {
      const orders = await this.prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        select: { number: true, email: true, status: true, paymentStatus: true, subtotal: true, discountAmount: true, shippingAmount: true, taxAmount: true, total: true, createdAt: true },
      });
      return {
        filename: `orders-${dayKey(start)}_${dayKey(end)}.csv`,
        csv: toCsv(
          ["number", "email", "status", "paymentStatus", "subtotal", "discount", "shipping", "tax", "total", "createdAt"],
          orders.map((order) => [order.number, order.email, order.status, order.paymentStatus, num(order.subtotal), num(order.discountAmount), num(order.shippingAmount), num(order.taxAmount), num(order.total), order.createdAt]),
        ),
      };
    }

    if (dataset === "products") {
      const rows = await this.prisma.orderItem.groupBy({
        by: ["name"],
        where: { order: { createdAt: where.createdAt, paymentStatus: "PAID" } },
        _sum: { totalPrice: true, quantity: true },
        orderBy: { _sum: { totalPrice: "desc" } },
      });
      return {
        filename: `products-${dayKey(start)}_${dayKey(end)}.csv`,
        csv: toCsv(["product", "quantitySold", "revenue"], rows.map((row) => [row.name, num(row._sum.quantity), num(row._sum.totalPrice)])),
      };
    }

    if (dataset === "customers") {
      const rows = await this.prisma.order.groupBy({
        by: ["email"],
        where,
        _sum: { total: true },
        _count: { _all: true },
        orderBy: { _sum: { total: "desc" } },
      });
      return {
        filename: `customers-${dayKey(start)}_${dayKey(end)}.csv`,
        csv: toCsv(["email", "orders", "totalSpent"], rows.map((row) => [row.email, row._count._all, num(row._sum.total)])),
      };
    }

    if (dataset === "inventory") {
      const products = await this.prisma.product.findMany({
        orderBy: { stockQuantity: "asc" },
        select: { sku: true, name: true, stockQuantity: true, trackInventory: true, status: true, basePrice: true },
      });
      return {
        filename: `inventory-${dayKey(new Date())}.csv`,
        csv: toCsv(
          ["sku", "name", "stockQuantity", "trackInventory", "status", "basePrice"],
          products.map((product) => [product.sku ?? "", product.name, product.stockQuantity, product.trackInventory, product.status, num(product.basePrice)]),
        ),
      };
    }

    throw new Error(`Unknown dataset "${dataset}". Use: orders | products | customers | inventory`);
  }
}
