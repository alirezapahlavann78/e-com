import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { CreateWarehouseDto, CreateSupplierDto, StockAdjustDto, SetInventoryDto } from "./dto/inventory.dto";

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async listWarehouses() {
    return this.prisma.warehouse.findMany({ orderBy: [{ isDefault: "desc" }, { name: "asc" }], include: { _count: { select: { items: true } } } });
  }

  async createWarehouse(dto: CreateWarehouseDto, actor: AuthUser) {
    if (dto.isDefault) await this.prisma.warehouse.updateMany({ data: { isDefault: false } });
    const w = await this.prisma.warehouse.create({ data: { name: dto.name, code: dto.code, isDefault: dto.isDefault ?? false, address: dto.address as Prisma.InputJsonValue } });
    await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "inventory.warehouse.create", entity: "Warehouse", entityId: w.id, after: w as any });
    return w;
  }

  async listSuppliers() {
    return this.prisma.supplier.findMany({ orderBy: { createdAt: "desc" } });
  }

  async createSupplier(dto: CreateSupplierDto, actor: AuthUser) {
    const s = await this.prisma.supplier.create({ data: dto });
    await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "inventory.supplier.create", entity: "Supplier", entityId: s.id, after: s as any });
    return s;
  }

  async listItems(query: { warehouseId?: string; productId?: string; lowOnly?: string }) {
    const where: any = {};
    if (query.warehouseId) where.warehouseId = query.warehouseId;
    if (query.productId) where.productId = query.productId;
    const items = await this.prisma.inventoryItem.findMany({
      where,
      include: { warehouse: { select: { id: true, name: true, code: true } }, product: { select: { id: true, name: true, sku: true } }, variant: { select: { id: true, title: true, sku: true } } },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });
    if (query.lowOnly === "true") return items.filter((i) => i.quantity - i.reserved <= i.lowStock);
    return items;
  }

  async setInventory(dto: SetInventoryDto, actor: AuthUser) {
    const existing = await this.prisma.inventoryItem.findFirst({ where: { warehouseId: dto.warehouseId, productId: dto.productId, variantId: dto.variantId ?? null } });
    const data = { quantity: dto.quantity, ...(dto.lowStock !== undefined ? { lowStock: dto.lowStock } : {}) };
    const item = existing
      ? await this.prisma.inventoryItem.update({ where: { id: existing.id }, data })
      : await this.prisma.inventoryItem.create({ data: { warehouseId: dto.warehouseId, productId: dto.productId, variantId: dto.variantId ?? null, ...data } });
    await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "inventory.set", entity: "InventoryItem", entityId: item.id, after: item as any });
    return item;
  }

  async adjust(dto: StockAdjustDto, actor: AuthUser) {
    if (!["IN", "OUT", "ADJUST"].includes(dto.type)) throw new BadRequestException("Invalid movement type");
    return this.prisma.$transaction(async (tx) => {
      let item = await tx.inventoryItem.findFirst({ where: { warehouseId: dto.warehouseId, productId: dto.productId, variantId: dto.variantId ?? null } });
      if (!item) item = await tx.inventoryItem.create({ data: { warehouseId: dto.warehouseId, productId: dto.productId, variantId: dto.variantId ?? null, quantity: 0 } });
      const delta = dto.type === "OUT" ? -dto.quantity : dto.quantity;
      if (item.quantity + delta < 0) throw new BadRequestException("Insufficient stock");
      const updated = await tx.inventoryItem.update({ where: { id: item.id }, data: { quantity: { increment: delta } } });
      const mv = await tx.stockMovement.create({ data: { warehouseId: dto.warehouseId, productId: dto.productId, variantId: dto.variantId ?? null, type: dto.type as any, quantity: dto.quantity, note: dto.note, actorId: actor.id } });
      await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "inventory.adjust", entity: "StockMovement", entityId: mv.id, after: { dto, resultingQuantity: updated.quantity } as any });
      return { item: updated, movement: mv };
    });
  }

  async movements(query: { warehouseId?: string; productId?: string }) {
    return this.prisma.stockMovement.findMany({
      where: { ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}), ...(query.productId ? { productId: query.productId } : {}) },
      include: { warehouse: { select: { code: true, name: true } }, product: { select: { name: true } } },
      orderBy: { createdAt: "desc" }, take: 100,
    });
  }

  async reservations(query: { status?: string }) {
    return this.prisma.stockReservation.findMany({
      where: query.status ? { status: query.status as any } : undefined,
      include: { warehouse: { select: { code: true } }, product: { select: { name: true } } },
      orderBy: { createdAt: "desc" }, take: 100,
    });
  }

  async defaultWarehouseId(tx: Prisma.TransactionClient | PrismaService = this.prisma) {
    const w = await tx.warehouse.findFirst({ where: { isDefault: true, isActive: true } }) ?? await tx.warehouse.findFirst({ where: { isActive: true } });
    if (!w) throw new BadRequestException("No active warehouse configured");
    return w.id;
  }
}
