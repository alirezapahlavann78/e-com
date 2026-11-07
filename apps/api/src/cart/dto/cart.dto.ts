import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class AddCartItemDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
  @ApiProperty() @IsInt() @Min(1) quantity!: number;
}
export class UpdateCartItemDto { @ApiProperty() @IsInt() @Min(1) quantity!: number; }
export class CartIdentityDto { @ApiPropertyOptional() @IsOptional() @IsString() guestToken?: string; }
