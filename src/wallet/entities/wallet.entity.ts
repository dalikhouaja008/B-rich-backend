import { Types } from 'mongoose';
import { User } from '../../auth/schemas/user.schema';

export class Wallet {
  walletName: string;
  balance: number;
  user: Types.ObjectId | User;
}
