import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Account, AccountDocument } from './entities/account.entity';

@Injectable()
export class AccountsService {
  constructor(
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
  ) {}

  // Create a new account without user association
  async createWithoutUser(accountData: Partial<Account>): Promise<Account> {
    const account = new this.accountModel({
      ...accountData,
      user: null,
      isDefault: false,
    });
    return account.save();
  }

  // Create a new account with user association
  async createWithUser(accountData: Partial<Account>, userId: string): Promise<Account> {
    // Check if this would be the user's first account
    const userAccounts = await this.findByUser(userId);
    const isDefault = userAccounts.length === 0; // Make it default if it's the first account

    const account = new this.accountModel({
      ...accountData,
      user: new Types.ObjectId(userId),
      isDefault,
    });
    return account.save();
  }

  // Fetch all accounts
  async findAll(): Promise<Account[]> {
    return this.accountModel.find().exec();
  }

  // Fetch all accounts for a specific user
  async findByUser(userId: string): Promise<Account[]> {
    return this.accountModel.find({ user: new Types.ObjectId(userId) }).exec();
  }

  // Fetch an account by ID
  async findOne(id: string): Promise<Account> {
    const account = await this.accountModel.findById(id).exec();
    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }
    return account;
  }

  // Update an account by ID
  async update(id: string, updateData: Partial<Account>, userId: string): Promise<Account> {
    const account = await this.accountModel.findById(id).exec();
    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }

    if (account.user && account.user.toString() !== userId) {
      throw new UnauthorizedException('You do not have permission to update this account');
    }

    const updatedAccount = await this.accountModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
    return updatedAccount;
  }

  // Delete an account by ID
  async delete(id: string, userId: string): Promise<void> {
    const account = await this.accountModel.findById(id).exec();
    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }

    if (account.user && account.user.toString() !== userId) {
      throw new UnauthorizedException('You do not have permission to delete this account');
    }

    await this.accountModel.findByIdAndDelete(id).exec();
  }

  // Fetch an account by RIB
  async findByRIB(rib: string): Promise<Account> {
    const account = await this.accountModel.findOne({ rib: rib }).exec();
    if (!account) {
      throw new NotFoundException(`Account with RIB ${rib} not found`);
    }
    return account;
  }

  // Associate account with user and update nickname
  async associateWithUserAndUpdateNickname(
    rib: string,
    nickname: string,
    userId: string,
  ): Promise<Account> {
    const account = await this.findByRIB(rib) as AccountDocument;

    // Check if account is already associated with a user
    if (account.user && account.user.toString() !== userId) {
      throw new UnauthorizedException('This account is already owned by another user');
    }

    // Check if this would be the user's first account
    const userAccounts = await this.findByUser(userId);
    const isDefault = userAccounts.length === 0;

    // Update the account
    account.user = new Types.ObjectId(userId);
    account.nickname = nickname;
    account.isDefault = isDefault;

    return account.save();
  }

  // Update account's default status
  async updateDefaultStatus(rib: string, userId: string): Promise<Account> {
    const account = await this.findByRIB(rib);

    if (!account.user || account.user.toString() !== userId) {
      throw new UnauthorizedException('You do not own this account');
    }

    // Reset isDefault for all user's accounts
    await this.accountModel
      .updateMany(
        { user: new Types.ObjectId(userId) },
        { $set: { isDefault: false } },
      )
      .exec();

    // Set the selected account as default using findOneAndUpdate
    return await this.accountModel.findOneAndUpdate(
      { rib: rib },
      { isDefault: true },
      { new: true }
    ).exec();
}
  // Get default account for a user
  async getDefaultAccount(userId: string): Promise<Account> {
    const account = await this.accountModel.findOne({
      user: new Types.ObjectId(userId),
      isDefault: true,
    }).exec();

    if (!account) {
      throw new NotFoundException('No default account found for this user');
    }

    return account;
  }


  // Update account balance
  async updateBalance(rib: string, amount: number, userId: string): Promise<Account> {
    const account = await this.findByRIB(rib);
  
    if (!account.user || account.user.toString() !== userId) {
      throw new UnauthorizedException('You do not own this account');
    }
  
    await this.accountModel.updateOne(
      { rib: rib },
      { balance: amount }
    );
  
    return await this.findByRIB(rib);
  }
  async getDashboardMetrics() {
    const [accounts, aggregateData] = await Promise.all([
      this.accountModel.find().exec(),
      this.accountModel.aggregate([
        {
          $group: {
            _id: null,
            totalBalance: { $sum: '$balance' },
            totalAccounts: { $sum: 1 },
            activeAccounts: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
            },
            inactiveAccounts: {
              $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] }
            }
          }
        }
      ]).exec()
    ]);

    const statusCount = accounts.reduce((acc, account) => {
      acc[account.status] = (acc[account.status] || 0) + 1;
      return acc;
    }, {});

    return {
      totalAccounts: accounts.length,
      activeAccounts: aggregateData[0]?.activeAccounts || 0,
      inactiveAccounts: aggregateData[0]?.inactiveAccounts || 0,
      totalBalance: aggregateData[0]?.totalBalance || 0,
      accountsByStatus: statusCount
    };
  }

  async getAccountDetails(id: string) {
    const account = await this.accountModel
      .findById(id)
      .populate('user', 'name email')
      .exec();

    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }

    return account;
  }
}
