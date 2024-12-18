import { Module } from '@nestjs/common';
import { SolanaService } from './solana.service';
import { SolanaController } from './solana.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Wallet, WalletSchema } from './schemas/wallet.schema';
import { ExchangeRateModule } from 'src/exchange-rate/exchange-rate.module';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';
import { AuthModule } from 'src/auth/auth.module';
import { User, UserSchema } from 'src/auth/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Wallet.name, schema: WalletSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: User.name, schema: UserSchema }, 
    ]),
    ExchangeRateModule,
    AuthModule
  ],
  controllers: [SolanaController],
  providers: [SolanaService,
    {
      provide: 'ENCRYPTION_KEY',
      useValue: process.env.ENCRYPTION_KEY || 'default-encryption-key',
    }],
  exports: [SolanaService]
})
export class SolanaModule {}
