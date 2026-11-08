import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";

export class UpdateCustomerProfileDto {
  @IsOptional() @IsBoolean() marketingOptIn?: boolean;
  @IsOptional() @IsBoolean() smsOptIn?: boolean;
}
export class CreateSegmentDto { @IsString() name!: string; @IsString() slug!: string; @IsOptional() @IsString() description?: string; @IsOptional() @IsBoolean() isActive?: boolean; }
export class CreateTagDto { @IsString() name!: string; @IsString() slug!: string; @IsOptional() @IsString() color?: string; }
export class AssignDto { @IsString() userId!: string; }
export class CreateCustomerNoteDto { @IsOptional() @IsEnum(["GENERAL","SUPPORT","RISK","MARKETING"] as const) type?: "GENERAL"|"SUPPORT"|"RISK"|"MARKETING"; @IsString() body!: string; }
