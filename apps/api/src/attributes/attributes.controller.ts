import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { AttributesService } from "./attributes.service";
import { CreateAttributeDto } from "./dto/create-attribute.dto";
import { UpdateAttributeDto } from "./dto/update-attribute.dto";

@ApiTags("admin-attributes")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("admin/attributes")
export class AttributesController {
  constructor(private service: AttributesService) {}
  @Get() @RequirePermissions("catalog:read") list() { return this.service.list(); }
  @Get(":id") @RequirePermissions("catalog:read") get(@Param("id") id: string) { return this.service.get(id); }
  @Post() @RequirePermissions("catalog:write") create(@Body() dto: CreateAttributeDto, @CurrentUser() user: AuthUser) { return this.service.create(dto, user); }
  @Patch(":id") @RequirePermissions("catalog:write") update(@Param("id") id: string, @Body() dto: UpdateAttributeDto, @CurrentUser() user: AuthUser) { return this.service.update(id, dto, user); }
  @Delete(":id") @RequirePermissions("catalog:write") remove(@Param("id") id: string, @CurrentUser() user: AuthUser) { return this.service.remove(id, user); }
}
