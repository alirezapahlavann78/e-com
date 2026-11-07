import { IsObject, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpsertSettingDto {
  @ApiProperty()
  @IsString()
  key!: string;

  @ApiProperty({ type: "object", additionalProperties: true })
  @IsObject()
  value!: Record<string, unknown>;
}
