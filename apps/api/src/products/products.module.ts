import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { ProductsService } from "./products.service";
import { AdminProductsController } from "./admin-products.controller";

@Module({ imports: [AuditModule], controllers: [AdminProductsController], providers: [ProductsService], exports: [ProductsService] })
export class ProductsModule {}
