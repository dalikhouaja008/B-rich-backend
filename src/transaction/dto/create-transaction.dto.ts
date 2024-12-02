import { IsDecimal, IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class CreateTransactionDto {
  @IsDecimal()
  amount: number;

  @IsEnum(['credit', 'debit'])
  type: 'credit' | 'debit';

  @IsString()
  @IsNotEmpty()
  description: string;
}
