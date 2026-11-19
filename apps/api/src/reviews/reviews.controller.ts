import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Public } from "../common/decorators/public.decorator";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { ReviewsService } from "./reviews.service";
import { CreateReviewDto, ModerateReviewDto, UploadReviewPhotoDto } from "./dto/reviews.dto";

@ApiTags("reviews")
@Controller("reviews")
export class ReviewsController {
  constructor(private reviews: ReviewsService) {}
  @Public() @Get("product/:slug") list(@Param("slug") slug: string) { return this.reviews.listPublicByProduct(slug); }
  @Public() @Post("product/:slug") submit(@Param("slug") slug: string, @Body() dto: CreateReviewDto, @CurrentUser() user: AuthUser | undefined) { return this.reviews.submit(slug, dto, user); }
  @Public() @Post("upload") upload(@Body() dto: UploadReviewPhotoDto, @Req() req: { ip?: string; headers: Record<string, unknown> }) {
    const forwarded = typeof req.headers["x-forwarded-for"] === "string" ? req.headers["x-forwarded-for"].split(",")[0]?.trim() : undefined;
    return this.reviews.uploadPhoto(dto, forwarded ?? req.ip);
  }
}

@ApiTags("reviews-admin")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("admin/reviews")
export class AdminReviewsController {
  constructor(private reviews: ReviewsService) {}
  @Permissions("crm:read") @Get() list(@Query() q: any) { return this.reviews.listAdmin(q); }
  @Permissions("crm:write") @Patch(":id/moderate") moderate(@Param("id") id: string, @Body() dto: ModerateReviewDto, @CurrentUser() u: AuthUser) { return this.reviews.moderate(id, dto, u); }
}
