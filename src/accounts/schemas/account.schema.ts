import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';
import { AccountType } from '../dtos/create-account.dto';

@Schema({ timestamps: true })
export class Account extends Document {
  @Prop({ required: false })
  accountNumber: string;

  @Prop({ required: false, enum: Object.values(AccountType),set: (value: string) => value?.toLowerCase() })
  type: AccountType;

  @Prop({ required: false, enum: ['active', 'inactive', 'blocked'],set: (value: string) => value?.toLowerCase(), default: 'active' })
  status: string;

  @Prop({ required: true, unique: true })
  rib: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: false })
  userId: Types.ObjectId;

  @Prop({ required: false })
  nickname: string;

  @Prop({ required: false, default: 0 })
  balance: number;

  @Prop({ default: false })
  isDefault: boolean;
}

export const AccountSchema = SchemaFactory.createForClass(Account);