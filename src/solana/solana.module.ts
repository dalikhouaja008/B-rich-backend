import { Module } from '@nestjs/common';
import { SolanaService } from './solana.service';
import { SolanaController } from './solana.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Wallet, WalletSchema } from './schemas/wallet.schema';
import { AuthModule } from 'src/auth/auth.module';
import { AuthorizationGuard } from 'src/guards/authorization.guard';

@Module({
  imports: [MongooseModule.forFeature([{name:Wallet.name, schema:WalletSchema}]), AuthModule],
  controllers: [SolanaController],
  providers: [SolanaService,AuthorizationGuard],
  exports: [SolanaService]
})
export class SolanaModule {}
