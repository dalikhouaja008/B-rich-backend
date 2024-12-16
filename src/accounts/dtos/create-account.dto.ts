import { IsString, IsEnum, IsNumber, IsOptional, IsBoolean, IsMongoId } from 'class-validator';

export enum AccountType {
  SAVINGS = 'savings',
  CHECKING = 'checking',
  INVESTMENT = 'investment'
}

export enum AccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  FROZEN = 'frozen'
}

export class CreateAccountDto {
  @IsString()
  accountNumber: string;

  @IsEnum(AccountType)
  type: AccountType;

  @IsEnum(AccountStatus)
  status: AccountStatus;

  @IsString()
  rib: string;

  @IsNumber()
  @IsOptional()
  balance?: number;

  @IsString()
  @IsOptional()
  nickname?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsMongoId()
  @IsOptional()
  userId?: string;
}