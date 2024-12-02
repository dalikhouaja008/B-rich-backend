import { PartialType } from '@nestjs/mapped-types';
import { CreateTransactionDto } from './create-transaction.dto';
import { IsOptional, IsDecimal, IsEnum, IsString } from 'class-validator';

export class UpdateTransactionDto extends PartialType(CreateTransactionDto) {

  @IsOptional()
  @IsDecimal()
  amount: number;

  @IsOptional()
  @IsEnum(['credit', 'debit'])
  transactionType: 'credit' | 'debit';

  @IsOptional()
  @IsString()
  description: string;

}
