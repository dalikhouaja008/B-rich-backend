import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema()
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  numTel: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: false, type: SchemaTypes.ObjectId, ref: 'Role' })
  roleId: Types.ObjectId;

  @Prop({ type: [SchemaTypes.ObjectId], ref: 'Wallet' })
  wallets: Types.ObjectId[];
}

export const UserSchema = SchemaFactory.createForClass(User);
