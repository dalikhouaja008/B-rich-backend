
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

@Schema()
class TokenBalance {
  @Prop({ required: true })
  symbol: string;

  @Prop({ required: true, default: 0 })
  balance: number;

  @Prop()
  tokenAccount?: string;
}

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
  network: string; // 'mainnet', 'devnet', 'testnet'
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
  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId }], default: [] })
  tradedTokens: TokenBalance[];
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);

