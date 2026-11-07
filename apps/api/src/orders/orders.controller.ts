import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { OrdersService } from "./orders.service";
import { UpdateOrderStatusDto, CreateOrderNoteDto, CreateShipmentDto, UpdateReturnDto, CreateRefundDto } from "./dto/orders.dto";

@ApiTags("admin/orders")
@ApiBearerAuth()
@Controller("admin/orders")
export class OrdersController {
  constructor(private orders: OrdersService) {}

  @Get() @RequirePermissions("orders:read") list(@Query() q: any) { return this.orders.list(q); }
  @Get("returns") @RequirePermissions("orders:read") returns(@Query() q: any) { return this.orders.listReturns(q); }
  @Get(":id") @RequirePermissions("orders:read") get(@Param("id") id: string) { return this.orders.get(id); }
  @Patch(":id/status") @RequirePermissions("orders:write") status(@Param("id") id: string, @Body() dto: UpdateOrderStatusDto, @CurrentUser() u: AuthUser) { return this.orders.updateStatus(id, dto, u); }
  @Post(":id/notes") @RequirePermissions("orders:write") note(@Param("id") id: string, @Body() dto: CreateOrderNoteDto, @CurrentUser() u: AuthUser) { return this.orders.addNote(id, dto, u); }
  @Post(":id/shipments") @RequirePermissions("orders:write") shipment(@Param("id") id: string, @Body() dto: CreateShipmentDto, @CurrentUser() u: AuthUser) { return this.orders.createShipment(id, dto, u); }
  @Post(":id/invoice") @RequirePermissions("orders:write") invoice(@Param("id") id: string, @CurrentUser() u: AuthUser) { return this.orders.generateInvoice(id, u); }
  @Post(":id/refunds") @RequirePermissions("orders:write") refund(@Param("id") id: string, @Body() dto: CreateRefundDto, @CurrentUser() u: AuthUser) { return this.orders.createRefund(id, dto, u); }
  @Patch("returns/:id") @RequirePermissions("orders:write") updateReturn(@Param("id") id: string, @Body() dto: UpdateReturnDto, @CurrentUser() u: AuthUser) { return this.orders.updateReturn(id, dto, u); }
}
