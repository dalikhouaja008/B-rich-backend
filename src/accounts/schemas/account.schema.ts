import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AccountDocument = Account & Document;

@Schema({ timestamps: true }) // Adds createdAt and updatedAt fields
export class Account {
  @Prop({ required: false, default: null }) // Allow nickname to be null
  nickname: string | null;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true, enum: ['active', 'inactive'] }) // Limit to specific values
  status: string;

  @Prop({ default: false })
  isDefault: boolean; // Ensure this property is defined here

  @Prop({ required: true, unique: true }) // Ensure rib is unique
  rib: string;

  @Prop({ type: Types.ObjectId, ref: 'User', unique: true })
  user: Types.ObjectId; // Reference to a User document
}

export const AccountSchema = SchemaFactory.createForClass(Account);
