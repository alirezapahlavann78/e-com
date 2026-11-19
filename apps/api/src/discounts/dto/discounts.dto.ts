import { IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { PartialType } from "@nestjs/swagger";

export class CreateDiscountCodeDto {
  @IsString() code!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(["PERCENT","FIXED_AMOUNT","FREE_SHIPPING"] as const) type?: "PERCENT"|"FIXED_AMOUNT"|"FREE_SHIPPING";
  @IsNumber() @Min(0) value!: number;
  @IsOptional() @IsNumber() minOrderAmount?: number;
  @IsOptional() @IsInt() @Min(1) maxUses?: number;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() endsAt?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() campaignId?: string;
  @IsOptional() @IsString() segmentId?: string;
}
export class UpdateDiscountCodeDto extends PartialType(CreateDiscountCodeDto) {}
export class ApplyDiscountDto { @IsString() code!: string; }
