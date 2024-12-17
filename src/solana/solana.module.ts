import { Module } from '@nestjs/common';
import { SolanaService } from './solana.service';
import { SolanaController } from './solana.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Wallet, WalletSchema } from './schemas/wallet.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Wallet.name, schema: WalletSchema }])
  ],
  controllers: [SolanaController],
  providers: [SolanaService],
  exports: [SolanaService]
})
export class SolanaModule {}
