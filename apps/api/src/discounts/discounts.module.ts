import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { DiscountsService } from "./discounts.service";
import { DiscountsController, PromotionsController } from "./discounts.controller";

@Module({ imports: [AuditModule], controllers: [DiscountsController, PromotionsController], providers: [DiscountsService], exports: [DiscountsService] })
export class DiscountsModule {}
