import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

@Schema({ timestamps: true })
export class ResetToken extends Document {
  @Prop({ required: true, type: mongoose.Types.ObjectId })
  userId: mongoose.Types.ObjectId;
  @Prop({ required: true })
  token: string;

  @Prop({ required: true })
  expiryDate: Date;

  @Prop({ required: true })
  email: string;

  @Prop({ default: false })
  used: boolean;
}

export const ResetTokenSchema = SchemaFactory.createForClass(ResetToken);
