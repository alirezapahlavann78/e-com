import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { CategoriesService } from "./categories.service";
import { AdminCategoriesController } from "./admin-categories.controller";

@Module({ imports: [AuditModule], controllers: [AdminCategoriesController], providers: [CategoriesService], exports: [CategoriesService] })
export class CategoriesModule {}
