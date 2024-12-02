import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Transaction, TransactionDocument } from './schemas/transaction.schema';
import { Wallet, WalletDocument } from '../wallet/schemas/wallet.schema';

@Injectable()
export class TransactionService {
  constructor(
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
    @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
  ) {}

  async createTransaction(walletId: string, amount: number, type: 'credit' | 'debit') {
    const wallet = await this.walletModel.findById(walletId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (type === 'debit' && wallet.balance < amount) {
      throw new Error('Insufficient balance');
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

  async getTransactionsByWalletAndUser(walletId: string, userId: string) {
    return this.transactionModel.find({ wallet: walletId, user: userId }).exec();
  }
  
}
