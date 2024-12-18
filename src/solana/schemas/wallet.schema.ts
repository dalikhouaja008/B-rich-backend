import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Wallet extends Document {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  walletName: string;

  @Prop({ required: true, default: 0 })
  balance: number;

  @Prop({ required: true })
  currency: string;

  @Prop({ required: true, default: 'GENERATED' })
  type: string;

  @Prop({ required: true })
  publicKey: string;

  @Prop({ required: true })
  privateKey: string;

  @Prop({ default: 0 })
  originalAmount: number;

  @Prop({ default: 'devnet' })
  network: string;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);