import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { CmsService } from "./cms.service";
import { CreatePageDto, PublishPageDto } from "./dto/page.dto";

@ApiTags("admin-cms")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("admin/cms")
export class AdminCmsController {
  constructor(private cms: CmsService) {}

  @Get("pages") @RequirePermissions("cms:read") list() { return this.cms.listPages(); }
  @Get("pages/:id") @RequirePermissions("cms:read") get(@Param("id") id: string) { return this.cms.getPage(id); }
  @Post("pages") @RequirePermissions("cms:write") create(@Body() dto: CreatePageDto, @CurrentUser() user: AuthUser) { return this.cms.createPage(dto, user); }
  @Patch("pages/:id") @RequirePermissions("cms:write") update(@Param("id") id: string, @Body() dto: CreatePageDto, @CurrentUser() user: AuthUser) { return this.cms.updatePage(id, dto, user); }
  @Post("pages/:id/publish") @RequirePermissions("cms:write") publish(@Param("id") id: string, @Body() dto: PublishPageDto, @CurrentUser() user: AuthUser) { return this.cms.publishPage(id, user, dto.versionId); }
  @Delete("pages/:id") @RequirePermissions("cms:write") remove(@Param("id") id: string, @CurrentUser() user: AuthUser) { return this.cms.removePage(id, user); }
  @Get("layout") @RequirePermissions("cms:read") layout(@Query("key") key = "default") { return this.cms.getLayout(key); }
  @Post("layout") @RequirePermissions("cms:write") upsertLayout(@Query("key") key = "default", @Body() body: { header?: unknown; footer?: unknown }, @CurrentUser() user: AuthUser) { return this.cms.upsertLayout(key, body, user); }
  @Get("menus") @RequirePermissions("cms:read") menus() { return this.cms.menus(); }
}
