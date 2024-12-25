// src/accounts/dto/create-account.dto.ts
import { IsString, IsEnum, IsNumber, IsOptional, IsBoolean, IsMongoId } from 'class-validator';
import { Types } from 'mongoose';

export enum AccountType {
  SAVINGS = 'savings',
  CHECKING = 'checking',
  INVESTMENT = 'investment'
}


export enum AccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BLOCKED = 'blocked'
}

export class CreateAccountDto {
  @IsString()
  accountNumber: string;

  @IsOptional()
  @IsEnum(AccountType)
  type?: AccountType;
//type: string;
  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;
//status: string;
  @IsString()
  rib: string;

  @IsNumber()
  @IsOptional()
  balance?: number;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

}