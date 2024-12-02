import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Get('/wallet/:walletId/user/:userId')
  async getTransactionsByWalletAndUser(
    @Param('walletId') walletId: string, 
    @Param('userId') userId: string,   
  ) {
    return this.transactionService.getTransactionsByWalletAndUser(walletId, userId);
  }

  @Post(':walletId')
async createTransaction(
  @Param('walletId') walletId: string,
  @Body() createTransactionDto: CreateTransactionDto,
) {
  const { amount, type } = createTransactionDto; // Extract type from DTO
  return this.transactionService.createTransaction(walletId, amount, type);
}

}
