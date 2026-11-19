import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { hashPassword, verifyPassword } from "../auth/crypto";
import type { ChangePasswordDto, CreateAddressDto, UpdateAddressDto, UpdateProfileDto } from "./dto/account.dto";

/** Loyalty ladder — kept in one place so the panel and the API agree. */
const TIERS = [
  { key: "BRONZE", label: "عضو تازه", min: 0, discount: 0 },
  { key: "SILVER", label: "عضو نقره‌ای", min: 5_000_000, discount: 5 },
  { key: "GOLD", label: "عضو طلایی", min: 15_000_000, discount: 10 },
] as const;

const num = (value: unknown) => Number(value ?? 0);
/** 1 point per 100,000 toman spent. */
const pointsFor = (spent: number) => Math.floor(spent / 100_000);

@Injectable()
export class AccountService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async addresses(userId: string) {
    return this.prisma.customerAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
  }

  async createAddress(userId: string, dto: CreateAddressDto) {
    const existing = await this.prisma.customerAddress.count({ where: { userId } });
    const isDefault = dto.isDefault ?? existing === 0;
    return this.prisma.$transaction(async (tx) => {
      if (isDefault) await tx.customerAddress.updateMany({ where: { userId }, data: { isDefault: false } });
      const address = await tx.customerAddress.create({
        data: {
          userId,
          title: dto.title ?? "آدرس جدید",
          fullName: dto.fullName,
          phone: dto.phone,
          country: dto.country ?? "ایران",
          province: dto.province,
          city: dto.city,
          postalCode: dto.postalCode,
          address1: dto.address1,
          address2: dto.address2,
          isDefault,
        },
      });
      await this.audit.log({ actorId: userId, actorEmail: "", action: "account.address.create", entity: "CustomerAddress", entityId: address.id, after: address });
      return address;
    });
  }

  async updateAddress(userId: string, id: string, dto: UpdateAddressDto) {
    const before = await this.prisma.customerAddress.findFirst({ where: { id, userId } });
    if (!before) throw new NotFoundException("Address not found");
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) await tx.customerAddress.updateMany({ where: { userId, id: { not: id } }, data: { isDefault: false } });
      const address = await tx.customerAddress.update({ where: { id }, data: dto });
      await this.audit.log({ actorId: userId, actorEmail: "", action: "account.address.update", entity: "CustomerAddress", entityId: id, before, after: address });
      return address;
    });
  }

  async deleteAddress(userId: string, id: string) {
    const address = await this.prisma.customerAddress.findFirst({ where: { id, userId } });
    if (!address) throw new NotFoundException("Address not found");
    const orderCount = await this.prisma.order.count({ where: { addressId: id } });
    // Order history must keep pointing at a real address row, so archive instead
    // of deleting when the address was already used for a shipment.
    if (orderCount > 0) {
      await this.prisma.customerAddress.update({
        where: { id },
        data: { title: `${address.title ?? "آدرس"} (آرشیو)`, isDefault: false },
      });
      await this.audit.log({ actorId: userId, actorEmail: "", action: "account.address.archive", entity: "CustomerAddress", entityId: id, before: address });
      return { ok: true, archived: true };
    }
    await this.prisma.customerAddress.delete({ where: { id } });
    await this.audit.log({ actorId: userId, actorEmail: "", action: "account.address.delete", entity: "CustomerAddress", entityId: id, before: address });
    if (address.isDefault) {
      const next = await this.prisma.customerAddress.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
      if (next) await this.prisma.customerAddress.update({ where: { id: next.id }, data: { isDefault: true } });
    }
    return { ok: true, archived: false };
  }

  async setDefaultAddress(userId: string, id: string) {
    const address = await this.prisma.customerAddress.findFirst({ where: { id, userId } });
    if (!address) throw new NotFoundException("Address not found");
    await this.prisma.$transaction([
      this.prisma.customerAddress.updateMany({ where: { userId }, data: { isDefault: false } }),
      this.prisma.customerAddress.update({ where: { id }, data: { isDefault: true } }),
    ]);
    return { ok: true };
  }

  async summary(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, createdAt: true, profile: true },
    });
    if (!user) throw new NotFoundException("User not found");

    const [orders, paidAgg, wishlistCount, addressCount, recentOrders] = await Promise.all([
      this.prisma.order.findMany({ where: { userId }, select: { status: true, paymentStatus: true, total: true, createdAt: true } }),
      this.prisma.order.aggregate({ where: { userId, paymentStatus: "PAID" }, _sum: { total: true }, _count: { _all: true } }),
      this.prisma.wishlistItem.count({ where: { userId } }),
      this.prisma.customerAddress.count({ where: { userId } }),
      this.prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, number: true, status: true, paymentStatus: true, total: true, createdAt: true, items: { select: { id: true, name: true, quantity: true, imageUrl: true } } },
      }),
    ]);

    const spent = num(paidAgg._sum.total);
    const tierIndex = TIERS.reduce((current, tier, index) => (spent >= tier.min ? index : current), 0);
    const tier = TIERS[tierIndex] ?? TIERS[0];
    const nextTier = TIERS[tierIndex + 1] ?? null;
    const inTransit = orders.filter((order) => ["PROCESSING", "SHIPPED"].includes(order.status)).length;
    const delivered = orders.filter((order) => ["DELIVERED", "COMPLETED"].includes(order.status)).length;

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        memberSince: user.createdAt,
      },
      preferences: {
        marketingOptIn: user.profile?.marketingOptIn ?? false,
        smsOptIn: user.profile?.smsOptIn ?? false,
      },
      stats: {
        orders: orders.length,
        paidOrders: paidAgg._count._all,
        totalSpent: spent,
        inTransit,
        delivered,
        wishlist: wishlistCount,
        addresses: addressCount,
        lastOrderAt: recentOrders[0]?.createdAt ?? null,
      },
      loyalty: {
        points: pointsFor(spent),
        tier: tier.key,
        tierLabel: tier.label,
        discount: tier.discount,
        nextTier: nextTier ? { key: nextTier.key, label: nextTier.label, discount: nextTier.discount, remaining: Math.max(0, nextTier.min - spent) } : null,
        progress: nextTier ? Math.min(100, Math.round(((spent - tier.min) / (nextTier.min - tier.min)) * 100)) : 100,
      },
      recentOrders,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const before = await this.prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true, phone: true } });
    if (!before) throw new NotFoundException("User not found");

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
      },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true },
    });

    if (dto.marketingOptIn !== undefined || dto.smsOptIn !== undefined) {
      await this.prisma.customerProfile.upsert({
        where: { userId },
        update: {
          ...(dto.marketingOptIn === undefined ? {} : { marketingOptIn: dto.marketingOptIn }),
          ...(dto.smsOptIn === undefined ? {} : { smsOptIn: dto.smsOptIn }),
        },
        create: {
          userId,
          marketingOptIn: dto.marketingOptIn ?? false,
          smsOptIn: dto.smsOptIn ?? false,
        },
      });
    }

    await this.audit.log({ actorId: userId, actorEmail: user.email, action: "account.profile.update", entity: "User", entityId: userId, before, after: user });
    return { ...user, preferences: { marketingOptIn: dto.marketingOptIn, smsOptIn: dto.smsOptIn } };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");
    if (!verifyPassword(dto.currentPassword, user.passwordHash)) {
      throw new ForbiddenException("Current password is incorrect");
    }
    if (verifyPassword(dto.newPassword, user.passwordHash)) {
      throw new BadRequestException("New password must be different from the current password");
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: hashPassword(dto.newPassword), failedLoginAttempts: 0, lockoutUntil: null },
      }),
      // other devices must sign in again with the new password
      this.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    await this.audit.log({ actorId: userId, actorEmail: user.email, action: "account.password.change", entity: "User", entityId: userId });
    return { ok: true };
  }
}
