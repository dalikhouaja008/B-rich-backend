import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document , Types } from 'mongoose';
import { User } from '../../auth/schemas/user.schema'; 

export type AccountDocument = Account & Document;
@Schema({ timestamps: true }) // Automatically adds createdAt and updatedAt fields
export class Account {
  @Prop({ required: false })
  number: string; // Account number

  @Prop({ required: false })
  type: string; // Type of the account (e.g., Savings, Checking)

  @Prop({ required: false, default: null })
  nickname: string | null; // Account nickname

  @Prop({ required: false, enum: ['active', 'inactive'] ,set: (value: string) => value?.toLowerCase() }) // Restrict status to specific values
  status: string; // Account status (e.g., Active, Inactive)

  @Prop({ required: true, unique: true })
  rib: string;  // Utilisez 'rib' en minuscules pour être cohérent

  @Prop({ default: false })
  isDefault: boolean; // Whether this is the default account

  @Prop({ required: false, type: Number, default: 0 })
  balance: number; // Account balance

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  userId: Types.ObjectId;  // Utiliser uniquement userId, pas user
}

// Generate a Mongoose schema from the Account class
export const AccountSchema = SchemaFactory.createForClass(Account);