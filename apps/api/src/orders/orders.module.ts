import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { OrdersController } from "./orders.controller";
import { MyOrdersController } from "./my-orders.controller";
import { OrdersService } from "./orders.service";

@Module({ imports: [AuditModule], controllers: [OrdersController, MyOrdersController], providers: [OrdersService], exports: [OrdersService] })
export class OrdersModule {}
