
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

@Schema()
export class Wallet extends Document {
  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ required: true, unique: true })
  publicKey: string;

  @Prop({ required: true, enum: ['devnet', 'testnet', 'mainnet'] })
  network: string;

  @Prop({ type: mongoose.Schema.Types.Decimal128, default: 0 })
  balance: number;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
  @Prop({ type: Boolean, default: false })
  isPhantomLinked: boolean;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);
