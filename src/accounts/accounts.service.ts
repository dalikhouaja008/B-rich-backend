import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types } from 'mongoose';
import { Account, AccountDocument } from './entities/account.entity';
import { CreateAccountDto } from './dtos/create-account.dto';

@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);
  
  constructor(
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
  ) {}

  // Create a new account
  async create(createAccountDto: CreateAccountDto): Promise<Account> {
    try {
      const createdAccount = new this.accountModel({
        ...createAccountDto,
        userId: null,    // Explicitement null
        nickname: null,  // Explicitement null
        isDefault: false // S'assurer que c'est false par défaut
      });
      return await createdAccount.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Account with this RIB already exists');
      }
      throw error;
    }
  }
  //link bank account to user
  async linkAccount(rib: string, nickname: string, userId: string): Promise<Account> {
    this.logger.log(`Starting account linking process for RIB: ${rib} with userId: ${userId}`);
    try {
        const existingAccount = await this.findByRIB(rib);
        this.logger.log(`Found existing account for RIB: ${rib}`);

        // Vérifier si le compte est déjà lié
        if (existingAccount.user) {
            this.logger.warn(`Account ${rib} is already linked to a user`);
            throw new ConflictException('Account is already linked to a user');
        }

        // Mettre à jour le compte avec le userId
        const updatedAccount = await this.accountModel.findOneAndUpdate(
            { rib },
            { 
                nickname,
                userId,  // Ajouter le userId
                updatedAt: new Date()
            },
            { new: true }
        ).exec();

        if (!updatedAccount) {
            this.logger.error(`Failed to update account with RIB: ${rib}`);
            throw new InternalServerErrorException('Failed to update account');
        }

        this.logger.log(`Successfully linked account with RIB: ${rib} to user: ${userId}`);
        return updatedAccount;
    } catch (error) {
        this.logger.error(
            `Error in linkAccount for RIB ${rib}: ${error.message}`,
            error.stack
        );
        throw error;
    }
}
  // Méthode pour vérifier si un RIB existe
  async checkRIBExists(rib: string): Promise<boolean> {
    try {
      const count = await this.accountModel
        .countDocuments({ rib })
        .exec();
      return count > 0;
    } catch (error) {
      throw new InternalServerErrorException('Error checking RIB');
    }
  }


  
  //récupérer accounts par user
  async findAllByUser(userId: string): Promise<Account[]> {
    try {
      return await this.accountModel
        .find({ userId: new Types.ObjectId(userId) })
        .exec();
    } catch (error) {
      throw new InternalServerErrorException('Error fetching user accounts');
    }
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
    const account = await this.accountModel.findOne({ 
        rib: rib,
        userId: null  // Ajoute la condition que user doit être null
    }).exec();
    
    if (!account) {
        throw new NotFoundException(`Account with RIB ${rib} not found or already linked to a user`);
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
  async getDefaultAccount(userId: string): Promise<Account> {
    if (!userId) {
        throw new BadRequestException('User ID is required');
    }

    try {
        if (!Types.ObjectId.isValid(userId)) {
            throw new BadRequestException('Invalid user ID format');
        }

        const account = await this.accountModel.findOne({
            userId: new Types.ObjectId(userId),
            isDefault: true
        }).exec();

        if (!account) {
            throw new NotFoundException(`No default account found for user ${userId}`);
        }

        return account;
    } catch (error) {
        if (error instanceof NotFoundException || error instanceof BadRequestException) {
            throw error;
        }
        console.error('Error in getDefaultAccount:', error);
        throw new InternalServerErrorException('Error while fetching default account');
    }
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
