import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class TestNotificationDto {
  @ApiProperty({ enum: ["EMAIL", "SMS"] })
  @IsIn(["EMAIL", "SMS"])
  channel!: "EMAIL" | "SMS";

  @ApiProperty({ description: "Email address or mobile number" })
  @IsString()
  @MaxLength(120)
  to!: string;
}

export class NotificationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  channel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  limit?: string;
}
