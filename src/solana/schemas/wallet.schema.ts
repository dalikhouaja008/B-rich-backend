// src/solana/schemas/wallet.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { TokenBalance } from 'src/swap/interface/tokenBalance.interface';


@Schema()
export class Wallet extends Document {
  @Prop() 
  userId: string;

  @Prop() 
  publicKey?: string;

  @Prop()
  privateKey?: string;

  @Prop({ 
    enum: ['GENERATED', 'PHANTOM', 'IMPORTED'],
    default: 'GENERATED'
  })
  type: string;

  @Prop()
  network: string;

  @Prop()
  balance: number;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop()
  currency?: string;

  @Prop()
  originalAmount?: number;

  @Prop()
  convertedAmount?: number;

  @Prop({
    type: [{
      symbol: String,
      balance: Number,
      mint: String,
      tokenAccount: String,
      swappedAmount: Number,
      lastSwapDate: Date
    }],
    default: []
  })
  tradedTokens: TokenBalance[];
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);