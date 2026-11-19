import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { HealthController } from "./health/health.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { RbacModule } from "./rbac/rbac.module";
import { AuditModule } from "./audit/audit.module";
import { SettingsModule } from "./settings/settings.module";
import { AttributesModule } from "./attributes/attributes.module";
import { CategoriesModule } from "./categories/categories.module";
import { ProductsModule } from "./products/products.module";
import { CatalogModule } from "./catalog/catalog.module";
import { CmsModule } from "./cms/cms.module";
import { MediaModule } from "./media/media.module";
import { RedirectsModule } from "./redirects/redirects.module";
import { CartModule } from "./cart/cart.module";
import { CheckoutModule } from "./checkout/checkout.module";
import { InventoryModule } from "./inventory/inventory.module";
import { OrdersModule } from "./orders/orders.module";
import { DiscountsModule } from "./discounts/discounts.module";
import { CrmModule } from "./crm/crm.module";
import { ReviewsModule } from "./reviews/reviews.module";
import { WishlistModule } from "./wishlist/wishlist.module";
import { StatsModule } from "./stats/stats.module";
import { ReportsModule } from "./reports/reports.module";
import { AccountModule } from "./account/account.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { PermissionsGuard } from "./common/guards/permissions.guard";
import { RateLimitGuard } from "./common/guards/rate-limit.guard";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ["../../.env", ".env"] }),
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
    RbacModule,
    SettingsModule,
    AttributesModule,
    CategoriesModule,
    ProductsModule,
    CatalogModule,
    CmsModule,
    MediaModule,
    RedirectsModule,
    DiscountsModule,
    CartModule,
    CheckoutModule,
    InventoryModule,
    OrdersModule,
    CrmModule,
    ReviewsModule,
    WishlistModule,
    StatsModule,
    ReportsModule,
    AccountModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
