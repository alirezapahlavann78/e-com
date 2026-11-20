import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CompleteSandboxPaymentDto {
  @ApiProperty({ description: "Authority returned when the payment was initiated" })
  @IsString()
  @MinLength(6)
  @MaxLength(120)
  authority!: string;

  @ApiProperty({ enum: ["success", "cancel"] })
  @IsIn(["success", "cancel"])
  outcome!: "success" | "cancel";
}

export class PaymentQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  limit?: string;
}
