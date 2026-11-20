import { ConflictException, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { hashPassword, hashToken, verifyPassword } from "./crypto";
import type { RegisterDto } from "./dto/register.dto";
import type { LoginDto } from "./dto/login.dto";
import { issueEmailVerification } from "./verification";
import { NotificationService } from "../notifications/notifications.service";

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
    private notifications: NotificationService,
  ) {}
  private accessTtl() { return parseTtl(this.config.get("JWT_ACCESS_TTL"), 900); }
  private refreshTtl() { return parseTtl(this.config.get("JWT_REFRESH_TTL"), 2592000); }
  private lockoutMax() { return Number(this.config.get("AUTH_LOCKOUT_MAX_ATTEMPTS") ?? 5); }
  private lockoutMinutes() { return Number(this.config.get("AUTH_LOCKOUT_MINUTES") ?? 15); }

  private async issueTokens(user: { id: string; email: string }, family: string = randomUUID(), meta?: { ip?: string; ua?: string }) {
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email, typ: "access" }, { secret: this.config.get("JWT_ACCESS_SECRET"), expiresIn: this.accessTtl() });
    const jti = randomUUID();
    const refreshToken = await this.jwt.signAsync({ sub: user.id, email: user.email, typ: "refresh", jti, family }, { secret: this.config.get("JWT_REFRESH_SECRET"), expiresIn: this.refreshTtl() });
    await this.prisma.refreshToken.create({ data: { userId: user.id, tokenHash: hashToken(refreshToken), family, expiresAt: new Date(Date.now() + this.refreshTtl() * 1000), ipAddress: meta?.ip, userAgent: meta?.ua } });
    return { accessToken, refreshToken, tokenType: "Bearer", expiresIn: this.accessTtl() };
  }

  async register(dto: RegisterDto, meta?: { ip?: string; ua?: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException("Email already registered");
    const user = await this.prisma.user.create({ data: { email: dto.email, passwordHash: hashPassword(dto.password), firstName: dto.firstName, lastName: dto.lastName } });
    const verification = await issueEmailVerification(this.prisma, user.id);
    await this.audit.log({ actorId: user.id, actorEmail: user.email, action: "auth.register", entity: "User", entityId: user.id, ipAddress: meta?.ip, userAgent: meta?.ua });
    const tokens = await this.issueTokens(user, randomUUID(), meta);
    // Queued: a mail hiccup must never block signup.
    await this.notifications.notifyWelcome(user).catch(() => undefined);
    return { user: this.safeUser(user), ...tokens, emailVerification: { required: true, expiresAt: verification.expiresAt, devToken: this.config.get("NODE_ENV") !== "production" ? verification.token : undefined } };
  }

  private lockedError(until: Date) {
    const minutes = Math.max(1, Math.ceil((until.getTime() - Date.now()) / 60_000));
    return new ForbiddenException({
      statusCode: 403,
      code: "ACCOUNT_LOCKED",
      message: `Account temporarily locked due to failed login attempts. Try again in ${minutes} minute(s), or run \`pnpm user:unlock\` to unlock it immediately.`,
      retryAfterMinutes: minutes,
    });
  }

  async login(dto: LoginDto, meta?: { ip?: string; ua?: string }) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException("Invalid credentials");
    if (user.lockoutUntil && user.lockoutUntil > new Date()) throw this.lockedError(user.lockoutUntil);
    if (!verifyPassword(dto.password, user.passwordHash)) {
      const attempts = (user.failedLoginAttempts ?? 0) + 1;
      const locked = attempts >= this.lockoutMax();
      const lockoutUntil = locked ? new Date(Date.now() + this.lockoutMinutes() * 60_000) : null;
      await this.prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: locked ? 0 : attempts, lockoutUntil } });
      await this.audit.log({ actorId: user.id, actorEmail: user.email, action: locked ? "auth.lockout" : "auth.login.failed", entity: "User", entityId: user.id, ipAddress: meta?.ip, userAgent: meta?.ua, metadata: { attempts } });
      throw locked && lockoutUntil
        ? this.lockedError(lockoutUntil)
        : new UnauthorizedException({ statusCode: 401, code: "INVALID_CREDENTIALS", message: "Invalid credentials", remainingAttempts: Math.max(0, this.lockoutMax() - attempts) });
    }
    if (user.status !== "ACTIVE") throw new UnauthorizedException("User inactive");
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), failedLoginAttempts: 0, lockoutUntil: null } });
    await this.audit.log({ actorId: user.id, actorEmail: user.email, action: "auth.login", entity: "User", entityId: user.id, ipAddress: meta?.ip, userAgent: meta?.ua });
    const tokens = await this.issueTokens(user, randomUUID(), meta);
    return { user: this.safeUser(user), ...tokens };
  }

  async verifyEmail(token: string, meta?: { ip?: string; ua?: string }) {
    const record = await this.prisma.emailVerificationToken.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
    if (!record || record.consumedAt || record.expiresAt < new Date() || record.purpose !== "EMAIL_VERIFY") throw new UnauthorizedException("Invalid or expired verification token");
    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({ where: { id: record.id }, data: { consumedAt: new Date() } }),
      this.prisma.emailVerificationToken.updateMany({ where: { userId: record.userId, purpose: "EMAIL_VERIFY", consumedAt: null, id: { not: record.id } }, data: { consumedAt: new Date() } }),
      this.prisma.user.update({ where: { id: record.userId }, data: { emailVerified: new Date() } }),
    ]);
    await this.audit.log({ actorId: record.userId, actorEmail: record.user.email, action: "auth.email_verified", entity: "User", entityId: record.userId, ipAddress: meta?.ip, userAgent: meta?.ua });
    return { ok: true };
  }

  async requestEmailVerification(userId: string, meta?: { ip?: string; ua?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    if (user.emailVerified) return { ok: true, alreadyVerified: true };
    const verification = await issueEmailVerification(this.prisma, user.id);
    await this.audit.log({ actorId: user.id, actorEmail: user.email, action: "auth.email_verification_requested", entity: "User", entityId: user.id, ipAddress: meta?.ip, userAgent: meta?.ua });
    return { ok: true, expiresAt: verification.expiresAt, devToken: this.config.get("NODE_ENV") !== "production" ? verification.token : undefined };
  }

  async refresh(refreshToken: string, meta?: { ip?: string; ua?: string }) {
    let payload: { sub: string; email: string; typ: string; family: string; jti: string };
    try { payload = await this.jwt.verifyAsync(refreshToken, { secret: this.config.get("JWT_REFRESH_SECRET") }); } catch { throw new UnauthorizedException("Invalid refresh token"); }
    if (payload.typ !== "refresh") throw new UnauthorizedException("Invalid token type");
    const tokenHash = hashToken(refreshToken);
    const record = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!record || record.revokedAt || record.expiresAt < new Date() || record.userId !== payload.sub) {
      if (record?.family) await this.prisma.refreshToken.updateMany({ where: { family: record.family, revokedAt: null }, data: { revokedAt: new Date() } });
      throw new UnauthorizedException("Refresh token revoked or invalid");
    }
    await this.prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== "ACTIVE") throw new UnauthorizedException("User inactive");
    const tokens = await this.issueTokens(user, payload.family, meta);
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
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } });
    if (!user) throw new UnauthorizedException();
    const permissions = Array.from(new Set(user.roles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.key))));
    return { ...this.safeUser(user), permissions, roles: user.roles.map((ur) => ur.role.name) };
  }

  private safeUser<T extends { passwordHash: string }>(user: T) { const { passwordHash: _, ...safe } = user; return safe; }
}
