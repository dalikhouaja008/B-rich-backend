import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';
import { Wallet } from '../../wallet/schemas/wallet.schema';

export type TransactionDocument = Transaction & Document;

@Schema()
export class Transaction {
  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  type: string;  

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Wallet', required: true })
  wallet: Types.ObjectId; 

  @Prop({ type: Date, default: Date.now })
  createdAt: Date; 
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
