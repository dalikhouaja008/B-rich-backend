import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import { Wallet } from 'src/solana/schemas/wallet.schema';

@Schema()
export class User extends Document {
  static findOne(arg0: { where: { id: string; }; }) {
    throw new Error('Method not implemented.');
  }
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  numTel: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, default: 1, enum: [0, 1] })
  role: number;

  @Prop({ required: false, type: Types.ObjectId })
  roleId: Types.ObjectId;
  wallet: any;

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Wallet' }] })
  wallets: Wallet[];

}

export const UserSchema = SchemaFactory.createForClass(User);