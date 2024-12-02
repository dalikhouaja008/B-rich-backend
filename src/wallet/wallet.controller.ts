import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { WalletService } from './wallet.service';

@Controller('wallets')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('create')
  async createWallet(
    @Body() body: { userId: string; name: string; initialBalance: number },
  ) {
    return this.walletService.createWallet(
      body.userId,
      body.name,
      body.initialBalance,
    );
  }

  @Get(':userId')
  async getWallets(@Param('userId') userId: string) {
    return this.walletService.getWalletsByUser(userId);
  }

  @Get('transactions/:walletId')
  async getTransactions(@Param('walletId') walletId: string) {
    return this.walletService.getTransactions(walletId);
  }

  @Post('transaction')
  async performTransaction(
    @Body()
    body: { walletId: string; amount: number; type: 'credit' | 'debit' },
  ) {
    return this.walletService.performTransaction(
      body.walletId,
      body.amount,
      body.type,
    );
  }
}
