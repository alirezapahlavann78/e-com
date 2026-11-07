import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { InventoryService } from "./inventory.service";
import { CreateWarehouseDto, CreateSupplierDto, StockAdjustDto, SetInventoryDto } from "./dto/inventory.dto";

@ApiTags("admin/inventory")
@ApiBearerAuth()
@Controller("admin/inventory")
export class InventoryController {
  constructor(private inv: InventoryService) {}

  @Get("warehouses") @RequirePermissions("inventory:read") warehouses() { return this.inv.listWarehouses(); }
  @Post("warehouses") @RequirePermissions("inventory:write") createWarehouse(@Body() dto: CreateWarehouseDto, @CurrentUser() u: AuthUser) { return this.inv.createWarehouse(dto, u); }
  @Get("suppliers") @RequirePermissions("inventory:read") suppliers() { return this.inv.listSuppliers(); }
  @Post("suppliers") @RequirePermissions("inventory:write") createSupplier(@Body() dto: CreateSupplierDto, @CurrentUser() u: AuthUser) { return this.inv.createSupplier(dto, u); }
  @Get("items") @RequirePermissions("inventory:read") items(@Query() q: any) { return this.inv.listItems(q); }
  @Post("items/set") @RequirePermissions("inventory:write") set(@Body() dto: SetInventoryDto, @CurrentUser() u: AuthUser) { return this.inv.setInventory(dto, u); }
  @Post("adjust") @RequirePermissions("inventory:write") adjust(@Body() dto: StockAdjustDto, @CurrentUser() u: AuthUser) { return this.inv.adjust(dto, u); }
  @Get("movements") @RequirePermissions("inventory:read") movements(@Query() q: any) { return this.inv.movements(q); }
  @Get("reservations") @RequirePermissions("inventory:read") reservations(@Query() q: any) { return this.inv.reservations(q); }
}
