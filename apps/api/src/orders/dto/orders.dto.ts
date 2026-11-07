import { IsEnum, IsOptional, IsString } from "class-validator";

export class UpdateOrderStatusDto {
  @IsOptional() @IsEnum(["PENDING","AWAITING_PAYMENT","PAID","PROCESSING","SHIPPED","DELIVERED","CANCELLED","REFUNDED","RETURN_REQUESTED"]) status?: string;
  @IsOptional() @IsEnum(["PENDING","AUTHORIZED","PAID","FAILED","REFUNDED"]) paymentStatus?: string;
  @IsOptional() @IsString() note?: string;
}
export class CreateOrderNoteDto { @IsString() body!: string; }
export class CreateShipmentDto {
  @IsOptional() @IsString() carrier?: string;
  @IsOptional() @IsString() service?: string;
  @IsOptional() @IsString() trackingNumber?: string;
  @IsOptional() @IsEnum(["PENDING","PROCESSING","SHIPPED","IN_TRANSIT","DELIVERED","RETURNED"]) status?: string;
  @IsOptional() address?: Record<string, unknown>;
}
export class UpdateReturnDto {
  @IsOptional() @IsEnum(["REQUESTED","APPROVED","REJECTED","RECEIVED","REFUNDED","CLOSED"]) status?: string;
  @IsOptional() @IsString() adminNote?: string;
}
export class CreateRefundDto {
  @IsOptional() @IsString() returnRequestId?: string;
  amount!: number;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsEnum(["PENDING","APPROVED","PROCESSED","FAILED"]) status?: string;
}
