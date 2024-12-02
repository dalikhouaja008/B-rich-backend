import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Wallet, WalletSchema } from './schemas/wallet.schema';
import { Transaction, TransactionSchema } from '../transaction/schemas/transaction.schema';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { TransactionModule } from '../transaction/transaction.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Wallet.name, schema: WalletSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: User.name, schema: UserSchema },
    ]),
    TransactionModule,
  ],
  controllers: [WalletController],
  providers: [WalletService],
})
export class WalletModule {}
