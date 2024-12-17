import { IsString, IsBoolean, IsNumber, IsOptional, IsNotEmpty, IsEnum } from 'class-validator';
import { Types } from 'mongoose';

export class CreateAccountDto {
  @IsOptional()
  @IsString()
  number?: string;

  @IsString()
  @IsEnum(['savings', 'checking', 'investment'])
  type: string;

  @IsOptional()
  @IsString()
  nickname?: string;

  @IsString()
  @IsEnum(['active', 'inactive'])
  status: string;

  @IsString()
  @IsNotEmpty()
  rib: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean = false;

  @IsNumber()
  @IsOptional()
  balance?: number = 0;

  @IsOptional()
  @IsEnum(['TND', 'USD'])
  currency?: string = 'TND';

  @IsString()
  @IsNotEmpty()
  user: string;
}