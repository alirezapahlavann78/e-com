import { ApiPropertyOptional } from "@nestjs/swagger";
import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class CreateReviewDto {
  @IsInt() @Min(1) @Max(5) rating!: number;
  @IsOptional() @IsString() @MaxLength(120) title?: string;
  @IsString() @MaxLength(2000) body!: string;
  @IsOptional() @IsString() @MaxLength(80) authorName?: string;
  @ApiPropertyOptional({ type: [String], description: "Photo URLs returned by POST /reviews/upload (max 3)" })
  @IsOptional() @IsArray() @ArrayMaxSize(3) @IsString({ each: true }) images?: string[];
}

export class ModerateReviewDto {
  @IsOptional() @IsString() status?: "PENDING" | "APPROVED" | "REJECTED";
}

export class UploadReviewPhotoDto {
  @IsString() dataUrl!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mimeType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() filename?: string;
}
