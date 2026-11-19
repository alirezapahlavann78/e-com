import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AccountService } from "./account.service";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { ChangePasswordDto, CreateAddressDto, UpdateAddressDto, UpdateProfileDto } from "./dto/account.dto";

@ApiTags("my-account")
@ApiBearerAuth()
@Controller("my")
export class AccountController {
  constructor(private account: AccountService) {}

  @Get("summary")
  summary(@CurrentUser() user: AuthUser) {
    return this.account.summary(user.id);
  }

  @Patch("profile")
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.account.updateProfile(user.id, dto);
  }

  @Post("password")
  changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.account.changePassword(user.id, dto);
  }

  @Get("addresses")
  addresses(@CurrentUser() user: AuthUser) {
    return this.account.addresses(user.id);
  }

  @Post("addresses")
  createAddress(@CurrentUser() user: AuthUser, @Body() dto: CreateAddressDto) {
    return this.account.createAddress(user.id, dto);
  }

  @Patch("addresses/:id")
  updateAddress(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdateAddressDto) {
    return this.account.updateAddress(user.id, id, dto);
  }

  @Delete("addresses/:id")
  deleteAddress(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.account.deleteAddress(user.id, id);
  }

  @Post("addresses/:id/default")
  setDefault(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.account.setDefaultAddress(user.id, id);
  }
}
