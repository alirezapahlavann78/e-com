import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../common/decorators/public.decorator";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { CartService } from "./cart.service";
import { AddCartItemDto, UpdateCartItemDto } from "./dto/cart.dto";

@ApiTags("cart")
@Controller("cart")
export class CartController {
  constructor(private cart: CartService) {}
  private id(user?: AuthUser, guestToken?: string) { return { userId: user?.id, guestToken }; }

  @Public() @Get()
  async get(@CurrentUser() user: AuthUser | undefined, @Query("guestToken") guestToken?: string) { return this.cart.summary(await this.cart.getOrCreate(this.id(user, guestToken))); }

  @Public() @Post("items")
  async add(@Body() dto: AddCartItemDto, @CurrentUser() user: AuthUser | undefined, @Query("guestToken") guestToken?: string) { return this.cart.summary(await this.cart.addItem({ ...this.id(user, guestToken), ...dto })); }

  @Public() @Patch("items/:id")
  async update(@Param("id") id: string, @Body() dto: UpdateCartItemDto, @CurrentUser() user: AuthUser | undefined, @Query("guestToken") guestToken?: string) { return this.cart.summary(await this.cart.updateItem({ ...this.id(user, guestToken), itemId: id, quantity: dto.quantity })); }

  @Public() @Delete("items/:id")
  async remove(@Param("id") id: string, @CurrentUser() user: AuthUser | undefined, @Query("guestToken") guestToken?: string) { return this.cart.summary(await this.cart.removeItem({ ...this.id(user, guestToken), itemId: id })); }
}
