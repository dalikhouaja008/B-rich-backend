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

  @Prop({ required: false, unique: true })
  rib: string;
  
  @Prop({ required: false })
  nickname: string;

  @Prop({ required: false, default: 0 })
  balance: number;

  @Prop({ default: false })
  isDefault: boolean;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: false })
  userId: Types.ObjectId;


}

export const AccountSchema = SchemaFactory.createForClass(Account);