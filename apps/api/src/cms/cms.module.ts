import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { CategoriesModule } from "../categories/categories.module";
import { ProductsModule } from "../products/products.module";
import { CmsService } from "./cms.service";
import { AdminCmsController } from "./admin-cms.controller";
import { PublicCmsController } from "./public-cms.controller";

@Module({ imports: [AuditModule, CategoriesModule, ProductsModule], controllers: [AdminCmsController, PublicCmsController], providers: [CmsService], exports: [CmsService] })
export class CmsModule {}
