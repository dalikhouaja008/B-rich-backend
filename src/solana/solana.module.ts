import { Module, OnModuleInit } from '@nestjs/common';
import { SolanaService } from './solana.service';
import { SolanaController } from './solana.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Wallet, WalletSchema } from './schemas/wallet.schema';
import { ExchangeRateModule } from 'src/exchange-rate/exchange-rate.module';
import { TransactionRecord, TransactionSchema } from './schemas/transaction.schema';
import { AuthModule } from 'src/auth/auth.module';
import { User, UserSchema } from 'src/auth/schemas/user.schema';
import { Account, AccountSchema } from 'src/accounts/entities/account.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Wallet.name, schema: WalletSchema },
      { name: TransactionRecord.name, schema: TransactionSchema },
      { name: User.name, schema: UserSchema }, 
      {name : Account.name, schema: AccountSchema}
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

