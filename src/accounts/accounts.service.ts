import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Account } from './schemas/account.schema';
import { CreateAccountDto } from './dtos/create-account.dto';

@Injectable()
export class AccountsService {
  constructor(
    @InjectModel(Account.name) private readonly accountModel: Model<Account>
  ) {}

  async create(createAccountDto: CreateAccountDto): Promise<Account> {
    const account = new this.accountModel(createAccountDto);
    return account.save();
  }

  async findByRib(rib: string): Promise<Account> {
    const account = await this.accountModel.findOne({ rib });
    if (!account) throw new NotFoundException('Account not found');
    return account;
  }

  async updateNickname(rib: string, nickname: string, userId: string): Promise<Account> {
    const account = await this.findByRib(rib);
    account.nickname = nickname;
    account.userId = userId;
    return account.save();
  }

  async findByUserId(userId: string): Promise<Account[]> {
    return this.accountModel.find({ userId }).exec();
  }

  async updateBalance(rib: string, balance: number): Promise<Account> {
    const account = await this.findByRib(rib);
    account.balance = balance;
    return account.save();
  }

  async delete(rib: string): Promise<{ acknowledged: boolean; deletedCount: number }> {
    const account = await this.findByRib(rib);
    return account.deleteOne();
  }
  async findById(id: string): Promise<Account> {
    const account = await this.accountModel.findById(id);
    if (!account) throw new NotFoundException('Account not found');
    return account;
  }

  async update(id: string, updateAccountDto: Partial<CreateAccountDto>): Promise<Account> {
    const account = await this.findById(id);
    Object.assign(account, updateAccountDto);
    return account.save();
  }
}