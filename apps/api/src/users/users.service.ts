import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { hashPassword } from "../auth/crypto";
import type { CreateUserDto } from "./dto/create-user.dto";
import type { UpdateUserDto } from "./dto/update-user.dto";
import type { AuthUser } from "../common/decorators/current-user.decorator";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async list(page = 1, limit = 20) {
    const take = Math.min(Math.max(limit, 1), 100);
    const skip = (Math.max(page, 1) - 1) * take;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: { roles: { include: { role: true } } },
      }),
      this.prisma.user.count(),
    ]);
    return { items: items.map((u) => this.safe(u)), total, page, limit: take };
  }

  async get(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, include: { roles: { include: { role: true } } } });
    if (!user) throw new NotFoundException("User not found");
    return this.safe(user);
  }

  async create(dto: CreateUserDto, actor: AuthUser) {
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: hashPassword(dto.password),
        firstName: dto.firstName,
        lastName: dto.lastName,
        isAdmin: dto.isAdmin ?? false,
      },
    });
    await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "users.create", entity: "User", entityId: user.id, after: this.safe(user) });
    return this.safe(user);
  }

  async update(id: string, dto: UpdateUserDto, actor: AuthUser) {
    const before = await this.prisma.user.findUnique({ where: { id }, include: { roles: true } });
    if (!before) throw new NotFoundException("User not found");
    const user = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          status: dto.status,
          isAdmin: dto.isAdmin,
        },
      });
      if (dto.roleIds) {
        await tx.userRole.deleteMany({ where: { userId: id } });
        if (dto.roleIds.length) {
          await tx.userRole.createMany({ data: dto.roleIds.map((roleId) => ({ userId: id, roleId })) });
        }
      }
      return updated;
    });
    await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "users.update", entity: "User", entityId: id, before: this.safe(before), after: this.safe(user) });
    return this.safe(user);
  }

  private safe<T extends { passwordHash: string }>(user: T) {
    const { passwordHash: _, ...safe } = user;
    return safe;
  }
}
