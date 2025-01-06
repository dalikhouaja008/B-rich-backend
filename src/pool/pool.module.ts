import { Module } from '@nestjs/common';
import { PoolService } from './pool.service';
import { PoolController } from './pool.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Wallet, WalletSchema } from 'src/solana/schemas/wallet.schema';
import { SolanaModule } from 'src/solana/solana.module';
import { TransactionDocument   , TransactionSchema } from 'src/solana/schemas/transaction.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Wallet.name, schema: WalletSchema },
      { name: TransactionDocument .name, schema: TransactionSchema }
    ]),
    SolanaModule
  ],
  controllers: [PoolController],
  providers: [PoolService]
})
export class PoolModule {}
