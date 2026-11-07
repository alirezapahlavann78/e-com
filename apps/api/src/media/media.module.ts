import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { MediaController } from "./media.controller";

@Module({ imports: [AuditModule], controllers: [MediaController] })
export class MediaModule {}
