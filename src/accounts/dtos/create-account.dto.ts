// src/accounts/dto/create-account.dto.ts
import { IsString, IsBoolean, IsNumber, IsOptional } from 'class-validator';

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

  @IsOptional() // This field is optional in case it's not provided
  @IsString() // Validate it as a string (MongoDB ObjectId is a string)
  userId?: string; // Optional field to associate the account with a user
}