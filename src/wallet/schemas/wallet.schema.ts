import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';
import { User } from '../../auth/schemas/user.schema'; 

export type WalletDocument = Wallet & Document;

@Schema()
export class Wallet {
  @Prop({ required: true })
  walletName: string;
  
  @Prop({ default: 0 })
  balance: number;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  owner: User;

}

export const WalletSchema = SchemaFactory.createForClass(Wallet);
