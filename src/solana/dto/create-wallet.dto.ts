import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';

export class createWalletDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  walletName: string;

  @IsNotEmpty()
  @IsString()
  currency: string;

  @IsNumber()
  amount: number;

  @IsString()
  @IsOptional()
  type?: string;
}