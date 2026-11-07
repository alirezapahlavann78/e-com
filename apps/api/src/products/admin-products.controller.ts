import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { ProductsService } from "./products.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";

@ApiTags("admin-products")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("admin/products")
export class AdminProductsController {
  constructor(private service: ProductsService) {}
  @Get() @RequirePermissions("catalog:read") list(@Query("page") page = "1", @Query("limit") limit = "20", @Query("status") status?: string) { return this.service.listAdmin(Number(page), Number(limit), status); }
  @Get(":id") @RequirePermissions("catalog:read") get(@Param("id") id: string) { return this.service.getAdmin(id); }
  @Post() @RequirePermissions("catalog:write") create(@Body() dto: CreateProductDto, @CurrentUser() user: AuthUser) { return this.service.create(dto, user); }
  @Patch(":id") @RequirePermissions("catalog:write") update(@Param("id") id: string, @Body() dto: UpdateProductDto, @CurrentUser() user: AuthUser) { return this.service.update(id, dto, user); }
  @Delete(":id") @RequirePermissions("catalog:write") remove(@Param("id") id: string, @CurrentUser() user: AuthUser) { return this.service.remove(id, user); }
}
