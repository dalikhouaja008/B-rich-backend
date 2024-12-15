import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Account, AccountDocument } from './schemas/account.schema';
import { CreateAccountDto } from './dtos/create-account.dto';

@Injectable()
export class AccountsService {
  constructor(
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
  ) {}

  async create(accountData: CreateAccountDto): Promise<Account> {
    const account = new this.accountModel(accountData);
    return account.save();
  }

  async findAll(): Promise<Account[]> {
    return this.accountModel.find().exec();
  }

  async findOne(id: string): Promise<Account> {
    const account = await this.accountModel.findById(id).exec();
    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }
    return account;
  }

  async findDefaultAccountByUserId(userId: string): Promise<Account> {
    const account = await this.accountModel
      .findOne({ user: userId, isDefault: true })
      .exec();
    if (!account) {
      throw new NotFoundException(`No default account found for user with ID ${userId}`);
    }
    return account;
  }

  async update(id: string, updateData: Partial<Account>): Promise<Account> {
    const account = await this.accountModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }
    return account;
  }

  async delete(id: string): Promise<void> {
    const result = await this.accountModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }
  }
}
