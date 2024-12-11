import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

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

  @Prop({ required: false, type: SchemaTypes.ObjectId })
  roleId: Types.ObjectId;

  //@Prop({ type: [{ type: Types.ObjectId, ref: 'Account' }] })
  //accounts: Types.ObjectId[]; // References to Account documents

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Account' }] })
  accounts: Types.ObjectId[]; // List of accounts associated with the user

}

export const UserSchema = SchemaFactory.createForClass(User);
