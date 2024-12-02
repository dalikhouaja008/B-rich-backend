import { PartialType } from '@nestjs/mapped-types';
import { CreateWalletDto } from './create-wallet.dto';
import { IsOptional, IsString, IsDecimal } from 'class-validator';


export class UpdateWalletDto extends PartialType(CreateWalletDto) {

  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsDecimal()
  balance: number;
}
