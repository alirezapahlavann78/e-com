import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class AddCartItemDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
  @ApiProperty() @IsInt() @Min(1) quantity!: number;
}
export class UpdateCartItemDto { @ApiProperty() @IsInt() @Min(1) quantity!: number; }
export class CartIdentityDto { @ApiPropertyOptional() @IsOptional() @IsString() guestToken?: string; }

export class GiftOptionsDto {
  @ApiProperty() @IsBoolean() giftWrap!: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(240) giftNote?: string;
}
