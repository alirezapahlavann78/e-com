import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";

@ApiTags("admin-users")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("admin/users")
export class UsersController {
  constructor(private users: UsersService) {}

  @Get()
  @RequirePermissions("users:read")
  list(@Query("page") page = "1", @Query("limit") limit = "20") {
    return this.users.list(Number(page), Number(limit));
  }

  @Get(":id")
  @RequirePermissions("users:read")
  get(@Param("id") id: string) {
    return this.users.get(id);
  }

  @Post()
  @RequirePermissions("users:write")
  create(@Body() dto: CreateUserDto, @CurrentUser() user: AuthUser) {
    return this.users.create(dto, user);
  }

  @Patch(":id")
  @RequirePermissions("users:write")
  update(@Param("id") id: string, @Body() dto: UpdateUserDto, @CurrentUser() user: AuthUser) {
    return this.users.update(id, dto, user);
  }
}
