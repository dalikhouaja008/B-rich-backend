import { Module } from '@nestjs/common';
import { OrcaService } from './orca.service';
import { OrcaController } from './orca.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Wallet, WalletSchema } from 'src/solana/schemas/wallet.schema';
import { SolanaModule } from 'src/solana/solana.module';
import { SolanaService } from 'src/solana/solana.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Wallet.name, schema: WalletSchema }]),
    SolanaModule
  ],
  controllers: [OrcaController],
  providers: [
    OrcaService,
    SolanaService
  
  ]
})
export class OrcaModule {}
