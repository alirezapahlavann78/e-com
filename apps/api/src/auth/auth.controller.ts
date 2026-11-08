import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { Public } from "../common/decorators/public.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { RateLimit } from "../common/decorators/rate-limit.decorator";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService) {}
  private meta(req: Request) { return { ip: req.ip, ua: req.headers["user-agent"] }; }

  @Public() @RateLimit(10, 60_000)
  @Post("register")
  register(@Body() dto: RegisterDto, @Req() req: Request) { return this.auth.register(dto, this.meta(req)); }

  @Public() @RateLimit(10, 60_000)
  @Post("login")
  login(@Body() dto: LoginDto, @Req() req: Request) { return this.auth.login(dto, this.meta(req)); }

  @Public() @RateLimit(20, 60_000)
  @Post("refresh")
  refresh(@Body() dto: RefreshDto, @Req() req: Request) { return this.auth.refresh(dto.refreshToken, this.meta(req)); }

  @Public() @RateLimit(20, 60_000)
  @Post("verify-email")
  verifyEmail(@Body() body: { token: string }, @Req() req: Request) { return this.auth.verifyEmail(body.token, this.meta(req)); }

  @ApiBearerAuth() @UseGuards(JwtAuthGuard) @RateLimit(10, 60_000)
  @Post("request-email-verification")
  requestEmailVerification(@CurrentUser() user: AuthUser, @Req() req: Request) { return this.auth.requestEmailVerification(user.id, this.meta(req)); }

  @Public() @RateLimit(20, 60_000)
  @Post("logout")
  logout(@Body() dto: RefreshDto, @Req() req: Request) { return this.auth.logout(dto.refreshToken, this.meta(req)); }

  @ApiBearerAuth() @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@CurrentUser() user: AuthUser) { return this.auth.me(user.id); }
}
