import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Account, AccountDocument } from './entities/account.entity';

@Injectable()
export class AccountsService {
  constructor(
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
  ) {}

  // Create a new account
  async create(accountData: Partial<Account>): Promise<Account> {
    const account = new this.accountModel(accountData);
    return account.save();
  }

  // Fetch all accounts
  async findAll(): Promise<Account[]> {
    return this.accountModel.find().exec();
  }

  // Fetch an account by ID
  async findOne(id: string): Promise<Account> {
    const account = await this.accountModel.findById(id).exec();
    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }
    return account;
  }

  // Fetch an account by RIB
  async findByRIB(rib: string): Promise<Account> {
    const account = await this.accountModel.findOne({ rib }).exec();
    if (!account) {
      throw new NotFoundException(`Account with RIB ${rib} not found`);
    }
    return account;
  }

  // Update an account by ID
  async update(id: string, updateData: Partial<Account>): Promise<Account> {
    const updatedAccount = await this.accountModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
    if (!updatedAccount) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }
    return updatedAccount;
  }

  // Delete an account by ID
  async delete(id: string): Promise<void> {
    const account = await this.accountModel.findByIdAndDelete(id).exec();
    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }
  }

  // Update account nickname
  async updateNickname(rib: string, nickname: string): Promise<Account> {
    const account = await this.findByRIB(rib) as AccountDocument;
    account.nickname = nickname;
    return account.save();
  }

  // Update account's default status
  async updateDefaultStatus(rib: string): Promise<Account> {
    const account = await this.findByRIB(rib) as AccountDocument;

    // Reset isDefault for all accounts
    await this.accountModel.updateMany({}, { $set: { isDefault: false } }).exec();

    // Set the selected account as default
    account.isDefault = true;
    return account.save();
  }

  // Get default account
  async getDefaultAccount(): Promise<Account> {
    const account = await this.accountModel.findOne({ isDefault: true }).exec();
    if (!account) {
      throw new NotFoundException('No default account found');
    }
    return account;
  }

  // Update account balance
  async updateBalance(rib: string, amount: number): Promise<Account> {
    const account = await this.findByRIB(rib) as AccountDocument;
    account.balance = amount;
    return account.save();
  }

  // Get dashboard metrics
  async getDashboardMetrics() {
    try {
      const aggregateData = await this.accountModel.aggregate([
        {
          $group: {
            _id: null,
            totalBalance: { $sum: '$balance' },
            totalAccounts: { $sum: 1 },
            activeAccounts: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] },
            },
            inactiveAccounts: {
              $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] },
            },
          },
        },
      ]);

      return (
        aggregateData[0] || {
          totalBalance: 0,
          totalAccounts: 0,
          activeAccounts: 0,
          inactiveAccounts: 0,
        }
      );
    } catch (error) {
      throw new InternalServerErrorException('Error fetching dashboard metrics');
    }
  }

  // Get account details by ID
  async getAccountDetails(id: string): Promise<Account> {
    const account = await this.accountModel.findById(id).exec();
    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }
    return account;
  }
}
