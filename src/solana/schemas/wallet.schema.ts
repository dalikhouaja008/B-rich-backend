
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

@Schema()
export class Wallet extends Document {
  static find(arg0: { where: { userId: string; }; }) {
    throw new Error('Method not implemented.');
  }
  @Prop() 
  userId: string;
  @Prop()
  publicKey: string;
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
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);
