import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Account, AccountDocument } from './schemas/account.schema';

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

  // Update an account by ID
  async update(id: string, updateData: Partial<Account>): Promise<Account> {
    const account = await this.accountModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }
    return account;
  }

  // Delete an account by ID
  async delete(id: string): Promise<void> {
    const result = await this.accountModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }
  }

  // Fetch an account by RIB
  async findByRIB(rib: string): Promise<Account> {
    const account = await this.accountModel.findOne({ rib }).exec();
    if (!account) {
      throw new NotFoundException(`Account with RIB ${rib} not found`);
    }
    return account;
  }

  // Update the nickname of an account by RIB
  async updateNicknameByRIB(rib: string, nickname: string): Promise<Account> {
    const account = await this.accountModel
      .findOneAndUpdate({ rib }, { nickname }, { new: true }) // Return the updated document
      .exec();
    if (!account) {
      throw new NotFoundException(`Account with RIB ${rib} not found`);
    }
    return account;
  }
}
