import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { OrdersService } from "./orders.service";

@ApiTags("my-orders")
@ApiBearerAuth()
@Controller("my/orders")
export class MyOrdersController {
  constructor(private orders: OrdersService) {}
  @Get() list(@CurrentUser() u: AuthUser) { return this.orders.myOrders(u.id); }
  @Get(":id") get(@CurrentUser() u: AuthUser, @Param("id") id: string) { return this.orders.myOrder(u.id, id); }
  @Post(":id/returns") requestReturn(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() body: { reason: string; customerNote?: string }) { return this.orders.createReturnRequest(u.id, id, body); }
}
