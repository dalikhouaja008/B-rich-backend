import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AccountDocument = Account & Document;

@Schema({ timestamps: true }) // Adds createdAt and updatedAt fields
export class Account {
  @Prop({ required: false, default: null }) // Allow nickname to be null
  nickname: string | null;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true, enum: ['active', 'inactive'] }) // Limit to specific values
  status: string;

  @Prop({ required: true, unique: true }) // Ensure rib is unique
  rib: string;
}

export const AccountSchema = SchemaFactory.createForClass(Account);