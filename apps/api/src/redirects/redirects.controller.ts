import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Public } from "../common/decorators/public.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { RedirectsService } from "./redirects.service";

@ApiTags("redirects")
@Controller()
export class RedirectsController {
  constructor(private redirects: RedirectsService) {}
  @Public() @Get("redirects/resolve") resolve(@Query("path") path = "") { return this.redirects.resolve(path); }
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, PermissionsGuard) @Get("admin/redirects") @RequirePermissions("cms:read") list() { return this.redirects.list(); }
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, PermissionsGuard) @Post("admin/redirects") @RequirePermissions("cms:write") create(@Body() body: any, @CurrentUser() user: AuthUser) { return this.redirects.create(body, user); }
}
