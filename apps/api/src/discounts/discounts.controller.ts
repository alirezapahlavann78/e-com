import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Public } from "../common/decorators/public.decorator";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { DiscountsService } from "./discounts.service";
import { ApplyDiscountDto, CreateDiscountCodeDto, UpdateDiscountCodeDto } from "./dto/discounts.dto";

@ApiTags("discounts")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("discounts")
export class DiscountsController {
  constructor(private discounts: DiscountsService) {}
  @Permissions("catalog:read") @Get() list() { return this.discounts.list(); }
  @Permissions("catalog:read") @Get(":id") get(@Param("id") id: string) { return this.discounts.get(id); }
  @Permissions("catalog:write") @Post() create(@Body() dto: CreateDiscountCodeDto, @CurrentUser() u: AuthUser) { return this.discounts.create(dto, u); }
  @Permissions("catalog:write") @Patch(":id") update(@Param("id") id: string, @Body() dto: UpdateDiscountCodeDto, @CurrentUser() u: AuthUser) { return this.discounts.update(id, dto, u); }
  @Permissions("catalog:write") @Delete(":id") remove(@Param("id") id: string, @CurrentUser() u: AuthUser) { return this.discounts.remove(id, u); }
}

@ApiTags("promotions")
@Controller("promotions")
export class PromotionsController {
  constructor(private discounts: DiscountsService) {}
  @Public() @Post("validate")
  validate(@Body() dto: ApplyDiscountDto & { subtotal?: number }, @CurrentUser() u: AuthUser | undefined, @Query("subtotal") subtotal?: string) {
    return this.discounts.resolveActive(dto.code, Number(dto.subtotal ?? subtotal ?? 0), u?.id);
  }
}
