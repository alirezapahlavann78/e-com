import { Module } from "@nestjs/common";
import { RbacController } from "./rbac.controller";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuditModule],
  controllers: [RbacController],
})
export class RbacModule {}
