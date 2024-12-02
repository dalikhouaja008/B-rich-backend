import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Wallet, WalletDocument } from './schemas/wallet.schema';
import { Transaction, TransactionDocument } from '../transaction/schemas/transaction.schema';
import { User, UserDocument } from '../auth/schemas/user.schema';

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async createWallet(userId: string, name: string, initialBalance: number) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
  
    const wallet = await this.walletModel.create({
      walletName: name,
      balance: initialBalance,
      user: userId,
    });
  
    return wallet;
  }
  
  

  async getWalletsByUser(userId: string) {
    return this.walletModel.find({ owner: userId }).populate('owner');
  }

  async getTransactions(walletId: string) {
    const wallet = await this.walletModel.findById(walletId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return this.transactionModel.find({ wallet: walletId });
  }

  async performTransaction(walletId: string, amount: number, type: 'credit' | 'debit') {
    const wallet = await this.walletModel.findById(walletId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (type === 'debit' && wallet.balance < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    wallet.balance += type === 'credit' ? amount : -amount;
    await wallet.save();

    const transaction = await this.transactionModel.create({
      wallet: walletId,
      amount,
      type,
      timestamp: new Date(),
    });

    return transaction;
  }
}
