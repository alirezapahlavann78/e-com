import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { ReviewsService } from "./reviews.service";
import { ReviewsController, AdminReviewsController } from "./reviews.controller";

@Module({ imports: [AuditModule], controllers: [ReviewsController, AdminReviewsController], providers: [ReviewsService], exports: [ReviewsService] })
export class ReviewsModule {}
