import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateAddressDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) title?: string;
  @ApiProperty() @IsString() @MaxLength(120) fullName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) country?: string;
  @ApiProperty() @IsString() @MaxLength(60) province!: string;
  @ApiProperty() @IsString() @MaxLength(60) city!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) postalCode?: string;
  @ApiProperty() @IsString() @MaxLength(240) address1!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(240) address2?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class UpdateAddressDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) fullName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) province?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) postalCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(240) address1?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(240) address2?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class UpdateProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() marketingOptIn?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() smsOptIn?: boolean;
}

export class ChangePasswordDto {
  @ApiProperty() @IsString() @MinLength(1) currentPassword!: string;
  @ApiProperty({ minLength: 8 }) @IsString() @MinLength(8) @MaxLength(72) newPassword!: string;
}
