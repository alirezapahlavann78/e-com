import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsBoolean, IsDateString, IsEnum, IsIn, IsInt, IsObject, IsOptional, IsString, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class SectionInputDto {
  @ApiProperty() @IsString() type!: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) sortOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isVisible?: boolean;
  @ApiProperty({ type: "object", additionalProperties: true }) @IsObject() config!: Record<string, unknown>;
}

export class CreatePageDto {
  @ApiProperty() @IsString() title!: string;
  @ApiProperty() @IsString() slug!: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(["HOME","PRODUCT_TEMPLATE","CATEGORY_TEMPLATE","BRAND","LANDING","BLOG","STATIC","CUSTOM"] as const) type?: "HOME"|"PRODUCT_TEMPLATE"|"CATEGORY_TEMPLATE"|"BRAND"|"LANDING"|"BLOG"|"STATIC"|"CUSTOM";
  @ApiPropertyOptional() @IsOptional() @IsEnum(["DRAFT","SCHEDULED","PUBLISHED","ARCHIVED"] as const) status?: "DRAFT"|"SCHEDULED"|"PUBLISHED"|"ARCHIVED";
  @ApiPropertyOptional() @IsOptional() @IsString() templateKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduledAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() metaTitle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() metaDescription?: string;
  @ApiPropertyOptional({ type: [SectionInputDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SectionInputDto) sections?: SectionInputDto[];
}

export class UpdatePageDto extends CreatePageDto {}
export class PublishPageDto { @ApiPropertyOptional() @IsOptional() @IsString() versionId?: string; }
