import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from "class-validator";

export class ProductImageDto {
  @ApiProperty() @IsString() url!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() alt?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) sortOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPrimary?: boolean;
}

export class ProductSeoDto {
  @ApiPropertyOptional() @IsOptional() @IsString() metaTitle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() metaDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() canonicalUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() noIndex?: boolean;
}

export class ProductVariantInputDto {
  @ApiProperty() @IsString() sku!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() barcode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() price?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() compareAtPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) stockQuantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() imageUrl?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) attributeValueIds?: string[];
}

export class ProductRelationInputDto {
  @ApiProperty() @IsString() toProductId!: string;
  @ApiPropertyOptional({ enum: ["RELATED", "COMPLEMENTARY"] }) @IsOptional() @IsEnum(["RELATED", "COMPLEMENTARY"] as const) type?: "RELATED" | "COMPLEMENTARY";
}

export class CreateProductDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() slug!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shortDescription?: string;
  @ApiPropertyOptional({ enum: ["SIMPLE", "VARIABLE"] }) @IsOptional() @IsEnum(["SIMPLE", "VARIABLE"] as const) type?: "SIMPLE" | "VARIABLE";
  @ApiPropertyOptional({ enum: ["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"] }) @IsOptional() @IsEnum(["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"] as const) status?: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
  @ApiPropertyOptional() @IsOptional() @IsString() sku?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() barcode?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() basePrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() compareAtPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) stockQuantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduledAt?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) categoryIds?: string[];
  @ApiPropertyOptional({ type: [ProductImageDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ProductImageDto) images?: ProductImageDto[];
  @ApiPropertyOptional({ type: ProductSeoDto }) @IsOptional() @ValidateNested() @Type(() => ProductSeoDto) seo?: ProductSeoDto;
  @ApiPropertyOptional({ type: [ProductVariantInputDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ProductVariantInputDto) variants?: ProductVariantInputDto[];
  @ApiPropertyOptional({ type: [ProductRelationInputDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ProductRelationInputDto) relations?: ProductRelationInputDto[];
}
