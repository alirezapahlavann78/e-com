import { Module } from "@nestjs/common";
import { CatalogController } from "./catalog.controller";
import { CategoriesModule } from "../categories/categories.module";
import { ProductsModule } from "../products/products.module";

@Module({ imports: [CategoriesModule, ProductsModule], controllers: [CatalogController] })
export class CatalogModule {}
