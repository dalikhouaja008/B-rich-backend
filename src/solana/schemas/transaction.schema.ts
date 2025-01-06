import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ 
  timestamps: true,
  collection: 'transactions'  // Exactement le même nom que dans MongoDB
})
export class TransactionDocument extends Document {
  @Prop({ required: true })
  signature: string;

  @Prop({ required: true })
  walletPublicKey: string;

  @Prop({ required: true })
  userId: string;

  @Prop()
  fromAddress: string;

  @Prop()
  toAddress: string;

  @Prop()
  amount: number;

  @Prop()
  blockTime: number;

  @Prop()
  status: string;

  @Prop()
  type: string;

  @Prop()
  timestamp: Date;

  @Prop()
  fee: number;
}

export const TransactionSchema = SchemaFactory.createForClass(TransactionDocument);