import { IsString, IsNumber, IsOptional, IsIn } from 'class-validator';

export class createWalletDto {
  @IsString()
  userId: string;

  @IsString()
  @IsIn(['GENERATED', 'PHANTOM', 'IMPORTED'])
  type: string;

  @IsOptional()
  @IsString()
  network?: string;

  @IsOptional()
  @IsNumber()
  balance?: number;

  @IsOptional()
  @IsString()
  currency?: string;
}
