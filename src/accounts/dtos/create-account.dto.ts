// src/accounts/dto/create-account.dto.ts
import { IsString, IsBoolean, IsNumber ,  IsOptional } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  number: string;

  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  nickname: string;

  @IsString()
  status: string;

  @IsString()
  RIB: string;

  @IsBoolean()
  isDefault: boolean;

  @IsNumber()
  balance: number;
}
