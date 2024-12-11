import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Types } from 'mongoose'; 
import { Account, AccountDocument } from './schemas/account.schema';
import * as nodemailer from 'nodemailer';

@Injectable()
export class AccountsService {
  constructor(
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
  ) {}

  // Create a new account and link it to a user
  async create(accountData: Partial<Account>, userId?: string): Promise<Account> {
    const account = new this.accountModel({
      ...accountData,
      user: userId,
    });
    return account.save();
  }

  // Fetch all accounts
  async findAll(): Promise<Account[]> {
    return this.accountModel.find().exec();
  }

  // Fetch all accounts for a specific user
  async findByUser(userId: string): Promise<Account[]> {
    return this.accountModel.find({ user: userId }).exec();
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
  async findByRIB(rib: string, userId: string): Promise<Account> {
    const account = await this.accountModel.findOne({ rib }).exec();
    if (!account) {
      throw new NotFoundException(`Account with RIB ${rib} not found`);
    }
    // Ensure the account belongs to the user
    if (account.user && account.user.toString() !== userId) {
      throw new UnauthorizedException(`You do not own this account`);
    }
    return account;
  }
  
  // Update the nickname of an account by RIB
  async updateNicknameByRIB(rib: string, nickname: string, userId: string): Promise<Account> {
    const account = await this.findByRIB(rib, userId) as AccountDocument;
    account.nickname = nickname;
    return account.save();
  }

  // Update isDefault for a specific user
  async updateIsDefaultByRIB(rib: string): Promise<Account> {
    const accountToUpdate = await this.accountModel.findOne({ rib }).exec();

    if (!accountToUpdate) {
      throw new NotFoundException(`Account with RIB ${rib} not found`);
    }

    // Reset isDefault for all accounts of the same user
    await this.accountModel
      .updateMany({ user: accountToUpdate.user }, { $set: { isDefault: false } })
      .exec();

    accountToUpdate.isDefault = true;
    await accountToUpdate.save();

    return accountToUpdate.save();
  }

  async addAccountToUserList(rib: string, userId: string): Promise<Account> {
    const account = await this.accountModel.findOne({ rib }).exec();
  
    if (!account) {
      throw new NotFoundException(`Account with RIB ${rib} not found`);
    }
    if (account.user && account.user.toString() !== userId) {
      throw new UnauthorizedException(`This account is already owned by another user`);
    }
  
    account.user = new Types.ObjectId(userId); // Convert userId to ObjectId
    return account.save(); // Save the updated account
  }
  

  private transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: 'your-email@ethereal.email',
      pass: 'your-password',
    },
  });

  generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendOtpToEmail(email: string, otp: string): Promise<void> {
    const mailOptions = {
      from: 'no-reply@yourapp.com',
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP code is: ${otp}`,
    };

    await this.transporter.sendMail(mailOptions);
  }
}
