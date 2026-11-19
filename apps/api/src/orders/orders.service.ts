import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@ecom/db";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { UpdateOrderStatusDto, CreateOrderNoteDto, CreateShipmentDto, UpdateReturnDto, CreateRefundDto } from "./dto/orders.dto";

function invNo() { return `INV-${Date.now().toString(36).toUpperCase()}`; }

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  private include = {
    items: true, payments: true, statusHistory: { orderBy: { createdAt: "desc" as const } },
    notes: { orderBy: { createdAt: "desc" as const } }, shipments: true, invoices: true, returnRequests: { include: { refunds: true } }, refunds: true,
  };

  async list(query: { status?: string; paymentStatus?: string; q?: string; page?: string; limit?: string }) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.paymentStatus) where.paymentStatus = query.paymentStatus;
    if (query.q) where.OR = [{ number: { contains: query.q, mode: "insensitive" } }, { email: { contains: query.q, mode: "insensitive" } }];
    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({ where, include: { items: true, payments: true, _count: { select: { returnRequests: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
      this.prisma.order.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async get(id: string) {
    const o = await this.prisma.order.findUnique({ where: { id }, include: this.include });
    if (!o) throw new NotFoundException("Order not found");
    return o;
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto, actor: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.order.findUnique({ where: { id } });
      if (!before) throw new NotFoundException("Order not found");
      const data: any = {};
      if (dto.status) data.status = dto.status;
      if (dto.paymentStatus) data.paymentStatus = dto.paymentStatus;
      const order = await tx.order.update({ where: { id }, data });
      await tx.orderStatusHistory.create({ data: { orderId: id, fromStatus: before.status, toStatus: order.status, fromPayment: before.paymentStatus, toPayment: order.paymentStatus, note: dto.note, actorId: actor.id, actorEmail: actor.email } });
      await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "order.status.update", entity: "Order", entityId: id, before: before as any, after: order as any });
      return order;
    });
  }

  async addNote(id: string, dto: CreateOrderNoteDto, actor: AuthUser) {
    await this.get(id);
    const note = await this.prisma.orderNote.create({ data: { orderId: id, body: dto.body, actorId: actor.id, actorEmail: actor.email } });
    await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "order.note.create", entity: "OrderNote", entityId: note.id, after: note as any });
    return note;
  }

  async createShipment(id: string, dto: CreateShipmentDto, actor: AuthUser) {
    await this.get(id);
    const shipment = await this.prisma.shipment.create({ data: { orderId: id, carrier: dto.carrier, service: dto.service, trackingNumber: dto.trackingNumber, status: (dto.status as any) ?? "PENDING", address: dto.address as Prisma.InputJsonValue } });
    if (dto.status === "SHIPPED") await this.updateStatus(id, { status: "SHIPPED", note: `Shipment ${shipment.trackingNumber ?? shipment.id}` }, actor);
    await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "order.shipment.create", entity: "Shipment", entityId: shipment.id, after: shipment as any });
    return shipment;
  }

  /**
   * Everything the printable invoice needs: the order with its items, the
   * newest invoice number (created on demand) and the store identity.
   */
  async invoiceData(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true, user: { select: { firstName: true, lastName: true, phone: true, email: true } }, shipments: true },
    });
    if (!order) throw new NotFoundException("Order not found");

    let invoice = await this.prisma.invoice.findFirst({ where: { orderId: id }, orderBy: { issuedAt: "desc" } });
    if (!invoice) {
      invoice = await this.prisma.invoice.create({
        data: {
          orderId: id,
          number: invNo(),
          currency: order.currency,
          subtotal: order.subtotal,
          discount: order.discountAmount,
          tax: order.taxAmount,
          shipping: order.shippingAmount,
          total: order.total,
          payload: { orderNumber: order.number, email: order.email, items: order.items, shippingAddress: order.shippingAddress } as Prisma.InputJsonValue,
        },
      });
    }

    const settings = await this.prisma.storeSetting.findMany({ where: { key: { startsWith: "store." } } });
    const store: Record<string, string> = {};
    for (const row of settings) {
      const raw = row.value as any;
      const value = raw && typeof raw === "object" && "value" in raw ? raw.value : raw;
      store[row.key] = value == null ? "" : String(value);
    }

    return { order, invoice, store };
  }

  async generateInvoice(id: string, actor: AuthUser) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new NotFoundException("Order not found");
    const invoice = await this.prisma.invoice.create({ data: { orderId: id, number: invNo(), currency: order.currency, subtotal: order.subtotal, discount: order.discountAmount, tax: order.taxAmount, shipping: order.shippingAmount, total: order.total, payload: { orderNumber: order.number, email: order.email, items: order.items, shippingAddress: order.shippingAddress } as Prisma.InputJsonValue } });
    await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "order.invoice.create", entity: "Invoice", entityId: invoice.id, after: invoice as any });
    return invoice;
  }

  async listReturns(query: { status?: string }) {
    return this.prisma.returnRequest.findMany({ where: query.status ? { status: query.status as any } : undefined, include: { order: { select: { id: true, number: true, email: true } }, refunds: true }, orderBy: { createdAt: "desc" } });
  }

  async updateReturn(id: string, dto: UpdateReturnDto, actor: AuthUser) {
    const ret = await this.prisma.returnRequest.update({ where: { id }, data: { status: dto.status as any, adminNote: dto.adminNote, resolvedAt: ["REFUNDED","CLOSED","REJECTED"].includes(dto.status ?? "") ? new Date() : undefined } });
    await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "return.update", entity: "ReturnRequest", entityId: id, after: ret as any });
    return ret;
  }

  async createRefund(orderId: string, dto: CreateRefundDto, actor: AuthUser) {
    const order = await this.get(orderId);
    const refund = await this.prisma.refund.create({ data: { orderId, returnRequestId: dto.returnRequestId, amount: dto.amount, currency: order.currency, status: (dto.status as any) ?? "PENDING", reason: dto.reason, processedAt: dto.status === "PROCESSED" ? new Date() : undefined } });
    if (dto.status === "PROCESSED") await this.prisma.order.update({ where: { id: orderId }, data: { status: "REFUNDED", paymentStatus: "REFUNDED" } });
    await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "order.refund.create", entity: "Refund", entityId: refund.id, after: refund as any });
    return refund;
  }

  async myOrders(userId: string) {
    return this.prisma.order.findMany({ where: { userId }, include: { items: true, shipments: true, invoices: true, statusHistory: { orderBy: { createdAt: "desc" } } }, orderBy: { createdAt: "desc" } });
  }

  async myOrder(userId: string, id: string) {
    const o = await this.prisma.order.findFirst({ where: { id, userId }, include: { items: true, payments: true, shipments: true, invoices: true, statusHistory: { orderBy: { createdAt: "desc" } }, returnRequests: true } });
    if (!o) throw new NotFoundException("Order not found");
    return o;
  }

  async createReturnRequest(userId: string, orderId: string, body: { reason: string; customerNote?: string }) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, userId } });
    if (!order) throw new NotFoundException("Order not found");
    return this.prisma.returnRequest.create({ data: { orderId, reason: body.reason, customerNote: body.customerNote } });
  }
}
