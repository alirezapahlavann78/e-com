import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { hashPassword, hashToken, verifyPassword } from "./crypto";
import type { RegisterDto } from "./dto/register.dto";
import type { LoginDto } from "./dto/login.dto";

function parseTtl(value: string | undefined, fallbackSeconds: number): number {
  if (!value) return fallbackSeconds;
  const m = /^(\d+)([smhd])$/.exec(value.trim());
  if (!m) return fallbackSeconds;
  const n = Number(m[1]);
  return { s: n, m: n * 60, h: n * 3600, d: n * 86400 }[m[2] as "s" | "m" | "h" | "d"];
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private audit: AuditService,
  ) {}

  private accessTtl() {
    return parseTtl(this.config.get("JWT_ACCESS_TTL"), 900);
  }
  private refreshTtl() {
    return parseTtl(this.config.get("JWT_REFRESH_TTL"), 2592000);
  }

  private async issueTokens(user: { id: string; email: string }, family = randomUUID(), meta?: { ip?: string; ua?: string }) {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, typ: "access" },
      { secret: this.config.get("JWT_ACCESS_SECRET"), expiresIn: this.accessTtl() },
    );
    const jti = randomUUID();
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, typ: "refresh", jti, family },
      { secret: this.config.get("JWT_REFRESH_SECRET"), expiresIn: this.refreshTtl() },
    );
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        family,
        expiresAt: new Date(Date.now() + this.refreshTtl() * 1000),
        ipAddress: meta?.ip,
        userAgent: meta?.ua,
      },
    });
    return { accessToken, refreshToken, tokenType: "Bearer", expiresIn: this.accessTtl() };
  }

  async register(dto: RegisterDto, meta?: { ip?: string; ua?: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException("Email already registered");
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: hashPassword(dto.password),
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });
    await this.audit.log({ actorId: user.id, actorEmail: user.email, action: "auth.register", entity: "User", entityId: user.id, ipAddress: meta?.ip, userAgent: meta?.ua });
    const tokens = await this.issueTokens(user, randomUUID(), meta);
    return { user: this.safeUser(user), ...tokens };
  }

  async login(dto: LoginDto, meta?: { ip?: string; ua?: string }) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !verifyPassword(dto.password, user.passwordHash)) {
      throw new UnauthorizedException("Invalid credentials");
    }
    if (user.status !== "ACTIVE") throw new UnauthorizedException("User inactive");
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await this.audit.log({ actorId: user.id, actorEmail: user.email, action: "auth.login", entity: "User", entityId: user.id, ipAddress: meta?.ip, userAgent: meta?.ua });
    const tokens = await this.issueTokens(user, randomUUID(), meta);
    return { user: this.safeUser(user), ...tokens };
  }

  async refresh(refreshToken: string, meta?: { ip?: string; ua?: string }) {
    let payload: { sub: string; email: string; typ: string; family: string; jti: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, { secret: this.config.get("JWT_REFRESH_SECRET") });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
    if (payload.typ !== "refresh") throw new UnauthorizedException("Invalid token type");
    const tokenHash = hashToken(refreshToken);
    const record = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!record || record.revokedAt || record.expiresAt < new Date() || record.userId !== payload.sub) {
      if (record?.family) {
        await this.prisma.refreshToken.updateMany({ where: { family: record.family, revokedAt: null }, data: { revokedAt: new Date() } });
      }
      throw new UnauthorizedException("Refresh token revoked or invalid");
    }
    await this.prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== "ACTIVE") throw new UnauthorizedException("User inactive");
    const tokens = await this.issueTokens(user, payload.family, meta);
    await this.prisma.refreshToken.updateMany({ where: { tokenHash: hashToken(tokens.refreshToken) }, data: {} });
    await this.audit.log({ actorId: user.id, actorEmail: user.email, action: "auth.refresh", entity: "User", entityId: user.id, ipAddress: meta?.ip, userAgent: meta?.ua });
    return { user: this.safeUser(user), ...tokens };
  }

  async logout(refreshToken: string, meta?: { ip?: string; ua?: string }) {
    const tokenHash = hashToken(refreshToken);
    const record = await this.prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } });
    if (record) {
      await this.prisma.refreshToken.updateMany({ where: { family: record.family, revokedAt: null }, data: { revokedAt: new Date() } });
      await this.audit.log({ actorId: record.userId, actorEmail: record.user.email, action: "auth.logout", entity: "User", entityId: record.userId, ipAddress: meta?.ip, userAgent: meta?.ua });
    }
    return { ok: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
    });
    if (!user) throw new UnauthorizedException();
    const permissions = Array.from(new Set(user.roles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.key))));
    return { ...this.safeUser(user), permissions, roles: user.roles.map((ur) => ur.role.name) };
  }

  private safeUser<T extends { passwordHash: string }>(user: T) {
    const { passwordHash: _, ...safe } = user;
    return safe;
  }
}
