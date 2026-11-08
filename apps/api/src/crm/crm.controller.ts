import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Permissions } from "../common/decorators/permissions.decorator";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { CrmService } from "./crm.service";
import { AssignDto, CreateCustomerNoteDto, CreateSegmentDto, CreateTagDto, UpdateCustomerProfileDto } from "./dto/crm.dto";

@ApiTags("crm-admin")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("crm")
export class CrmController {
  constructor(private crm: CrmService) {}
  @Permissions("crm:read") @Get("customers") list(@Query() q: any) { return this.crm.listCustomers(q); }
  @Permissions("crm:read") @Get("customers/:id") detail(@Param("id") id: string) { return this.crm.customerDetail(id); }
  @Permissions("crm:write") @Patch("customers/:id/profile") updateProfile(@Param("id") id: string, @Body() dto: UpdateCustomerProfileDto, @CurrentUser() u: AuthUser) { return this.crm.updateProfile(id, dto, u); }
  @Permissions("crm:write") @Post("customers/:id/notes") addNote(@Param("id") id: string, @Body() dto: CreateCustomerNoteDto, @CurrentUser() u: AuthUser) { return this.crm.addNote(id, dto, u); }

  @Permissions("crm:read") @Get("segments") listSegments() { return this.crm.listSegments(); }
  @Permissions("crm:write") @Post("segments") createSegment(@Body() dto: CreateSegmentDto, @CurrentUser() u: AuthUser) { return this.crm.createSegment(dto, u); }
  @Permissions("crm:write") @Post("segments/:id/members") assignSegment(@Param("id") id: string, @Body() dto: AssignDto, @CurrentUser() u: AuthUser) { return this.crm.assignSegment(id, dto.userId, u); }
  @Permissions("crm:write") @Delete("segments/:id/members/:userId") removeSegment(@Param("id") id: string, @Param("userId") userId: string, @CurrentUser() u: AuthUser) { return this.crm.removeSegmentMember(id, userId, u); }

  @Permissions("crm:read") @Get("tags") listTags() { return this.crm.listTags(); }
  @Permissions("crm:write") @Post("tags") createTag(@Body() dto: CreateTagDto, @CurrentUser() u: AuthUser) { return this.crm.createTag(dto, u); }
  @Permissions("crm:write") @Post("tags/:id/assign") assignTag(@Param("id") id: string, @Body() dto: AssignDto, @CurrentUser() u: AuthUser) { return this.crm.assignTag(id, dto.userId, u); }
  @Permissions("crm:write") @Delete("tags/:id/assign/:userId") removeTag(@Param("id") id: string, @Param("userId") userId: string, @CurrentUser() u: AuthUser) { return this.crm.removeTag(id, userId, u); }
}

@ApiTags("my-profile")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("my/profile")
export class MyProfileController {
  constructor(private crm: CrmService) {}
  @Get() get(@CurrentUser() u: AuthUser) { return this.crm.myProfile(u.id); }
}
