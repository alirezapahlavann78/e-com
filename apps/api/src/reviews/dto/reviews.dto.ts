import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";
export class CreateReviewDto { @IsInt() @Min(1) @Max(5) rating!: number; @IsOptional() @IsString() title?: string; @IsString() body!: string; @IsOptional() @IsString() authorName?: string; }
export class ModerateReviewDto { @IsOptional() @IsString() status?: "PENDING"|"APPROVED"|"REJECTED"; }
