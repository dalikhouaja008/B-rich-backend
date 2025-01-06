import { Module } from '@nestjs/common';
import { SwapService } from './swap.service';
import { SwapController } from './swap.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Wallet, WalletSchema } from 'src/solana/schemas/wallet.schema';
import {  TransactionDocument , TransactionSchema } from 'src/solana/schemas/transaction.schema';
import { SolanaModule } from 'src/solana/solana.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Wallet.name, schema: WalletSchema },
      { name: TransactionDocument .name, schema: TransactionSchema }
    ]),
    SolanaModule
  ],
  controllers: [SwapController],
  providers: [SwapService]
})
export class SwapModule {}
