import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Account extends Document {
  @Prop({ required: true })
  accountNumber: string;

  @Prop({ required: true, enum: ['savings', 'checking', 'investment'] })
  type: string;

  @Prop({ required: true, enum: ['active', 'inactive', 'frozen'] })
  status: string;

  @Prop({ required: true, unique: true })
  rib: string;

  @Prop({ required: false })
  userId: string;

  @Prop({ required: false })
  nickname: string;

  @Prop({ required: true, default: 0 })
  balance: number;

  @Prop({ default: false })
  isDefault: boolean;
}

export const AccountSchema = SchemaFactory.createForClass(Account);