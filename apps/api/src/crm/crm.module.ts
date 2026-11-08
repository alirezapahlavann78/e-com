import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { CrmService } from "./crm.service";
import { CrmController, MyProfileController } from "./crm.controller";
import { MarketingController } from "./marketing.controller";

@Module({ imports: [AuditModule], controllers: [CrmController, MyProfileController, MarketingController], providers: [CrmService], exports: [CrmService] })
export class CrmModule {}
