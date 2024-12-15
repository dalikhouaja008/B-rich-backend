import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from 'src/auth/schemas/user.schema';

// Define a TypeScript type for the Account document
export type AccountDocument = Account & Document;

@Schema({ timestamps: true }) // Automatically adds createdAt and updatedAt fields
export class Account {
  @Prop({ required: true })
  number: string; // Account number

  @Prop({ required: true })
  type: string; // Type of the account (e.g., Savings, Checking)

  @Prop({ required: false, default: null })
  nickname: string | null; // Account nickname

  @Prop({ required: true, enum: ['active', 'inactive'] }) // Restrict status to specific values
  status: string; // Account status (e.g., Active, Inactive)

  @Prop({ required: true, unique: true }) // Ensure RIB is unique
  RIB: string; // Bank Identifier (RIB)

  @Prop({ default: false })
  isDefault: boolean; // Whether this is the default account

  @Prop({ required: true, type: Number, default: 0 })
  balance: number; // Account balance

  //relation avec user
  @Prop({ type: Types.ObjectId, ref: 'User' })
  user: User;
}

// Generate a Mongoose schema from the Account class
export const AccountSchema = SchemaFactory.createForClass(Account);