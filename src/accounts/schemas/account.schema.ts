import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from 'src/auth/schemas/user.schema';

export type AccountDocument = Account & Document;

@Schema({ timestamps: true })
export class Account {
  save(): Account | PromiseLike<Account> {
    throw new Error('Method not implemented.');
  }
  @Prop({ required: true, default: () => `ACC-${Date.now()}` })
  number: string;

  @Prop({ required: true, enum: ['savings', 'checking', 'investment'], default: 'checking' })
  type: string;

  @Prop({ default: null })
  nickname: string;

  @Prop({ 
    required: true, 
    enum: ['active', 'inactive'], 
    default: 'active' 
  })
  status: string;

  @Prop({ required: true, unique: true })
  rib: string;

  @Prop({ default: false })
  isDefault: boolean;

  @Prop({ 
    type: Number, 
    default: 0, 
    min: 0 // Ensure balance is never negative
  })
  balance: number;

  @Prop({ 
    required: true, 
    enum: ['TND', 'USD'], 
    default: 'TND' 
  })
  currency: string;

  @Prop({ 
    type: Types.ObjectId, 
    ref: 'User', 
    required: true 
  })
  user: Types.ObjectId;
}

export const AccountSchema = SchemaFactory.createForClass(Account);