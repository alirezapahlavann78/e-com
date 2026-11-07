import { IsBoolean, IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateWarehouseDto {
  @IsString() name!: string;
  @IsString() code!: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
  @IsOptional() address?: Record<string, unknown>;
}

export class CreateSupplierDto {
  @IsString() name!: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() notes?: string;
}

export class StockAdjustDto {
  @IsString() warehouseId!: string;
  @IsString() productId!: string;
  @IsOptional() @IsString() variantId?: string;
  @IsInt() @Min(1) quantity!: number;
  @IsOptional() @IsString() note?: string;
  @IsString() type!: "IN" | "OUT" | "ADJUST";
}

export class SetInventoryDto {
  @IsString() warehouseId!: string;
  @IsString() productId!: string;
  @IsOptional() @IsString() variantId?: string;
  @IsInt() @Min(0) quantity!: number;
  @IsOptional() @IsInt() @Min(0) lowStock?: number;
}
