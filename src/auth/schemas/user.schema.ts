import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class User extends Document {
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
}

export const UserSchema = SchemaFactory.createForClass(User);