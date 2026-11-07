import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { AuthUser } from "../common/decorators/current-user.decorator";

@Injectable()
export class RedirectsService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}
  list() { return this.prisma.redirect.findMany({ orderBy: { createdAt: "desc" } }); }
  async create(data: { fromPath: string; toPath: string; type?: "PERMANENT_301" | "TEMPORARY_302"; entityType?: string; entityId?: string }, actor: AuthUser) {
    const item = await this.prisma.redirect.upsert({ where: { fromPath: data.fromPath }, update: { toPath: data.toPath, type: data.type ?? "PERMANENT_301", entityType: data.entityType, entityId: data.entityId, isActive: true }, create: { fromPath: data.fromPath, toPath: data.toPath, type: data.type ?? "PERMANENT_301", entityType: data.entityType, entityId: data.entityId } });
    await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "redirect.upsert", entity: "Redirect", entityId: item.id, after: item });
    return item;
  }
  resolve(fromPath: string) { return this.prisma.redirect.findFirst({ where: { fromPath, isActive: true } }); }
}
