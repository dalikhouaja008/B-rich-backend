import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';
import { AccountType } from '../dtos/create-account.dto';

@Schema({ 
  timestamps: true,
  collection: 'accounts'
})
export class Account extends Document {
  @Prop({ required: false })
  accountNumber: string;

  @Prop({ required: false, enum: Object.values(AccountType), set: (value: string) => value?.toLowerCase() })
  type: AccountType;

  @Prop({ required: false, enum: ['active', 'inactive', 'blocked'], set: (value: string) => value?.toLowerCase(), default: 'active' })
  status: string;

  @Prop({ required: true, unique: true })  
  rib: string;
  
  @Prop({ required: false })
  nickname: string;

  @Prop({ required: false, default: 0 })
  balance: number;

  @Prop({ default: false })
  isDefault: boolean;

  @Prop({ 
    type: SchemaTypes.ObjectId, 
    ref: 'User', 
    required: false,
    default: null,  
    index: { sparse: true } 
  })
  userId: Types.ObjectId | null;  // Ajouter | null
}

export const AccountSchema = SchemaFactory.createForClass(Account);

// Ajouter l'index sparse après la création du schéma
AccountSchema.index({ userId: 1 }, { sparse: true });