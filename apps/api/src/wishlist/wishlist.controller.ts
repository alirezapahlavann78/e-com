import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { WishlistService } from "./wishlist.service";
import { WishlistAddDto } from "./dto/wishlist.dto";

@ApiTags("wishlist")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("my/wishlist")
export class WishlistController {
  constructor(private wishlist: WishlistService) {}
  @Get() list(@CurrentUser() u: AuthUser) { return this.wishlist.list(u.id); }
  @Post() add(@CurrentUser() u: AuthUser, @Body() dto: WishlistAddDto) { return this.wishlist.add(u.id, dto.productId); }
  @Delete(":productId") remove(@CurrentUser() u: AuthUser, @Param("productId") productId: string) { return this.wishlist.remove(u.id, productId); }
}
