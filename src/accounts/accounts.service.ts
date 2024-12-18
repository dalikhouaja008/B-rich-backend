import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Account, AccountDocument } from './schemas/account.schema';
import { CreateAccountDto } from './dtos/create-account.dto';

@Injectable()
export class AccountsService {
  accountRepository: any;
  constructor(
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
  ) {}

  async create(accountData: CreateAccountDto): Promise<Account> {
    // Ensure currency is set, defaulting to TND if not provided
    const accountWithCurrency = {
      ...accountData,
      currency: accountData.currency || 'TND'
    };

    const account = new this.accountModel(accountWithCurrency);
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

  /*
  async findDefaultAccountByUserId(userId: string): Promise<Account> {
    const account = await this.accountModel
      .findOne({ user: userId, isDefault: true })
      .exec();
    if (!account) {
      throw new NotFoundException(`No default account found for user with ID ${userId}`);
    }
    return account;
  }*/

  async update(id: string, updateData: Partial<Account>): Promise<Account> {
    const account = await this.accountModel
      .findByIdAndUpdate(
        id, 
        updateData, 
        { 
          new: true,
          runValidators: true // Ensure enum validation is run
        }
      )
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

  /*
  // Créer un compte par défaut pour un utilisateur
  async createDefaultAccount(userId: string): Promise<Account> {
    // Vérifier s'il existe déjà un compte par défaut
    const existingAccount = await this.findDefaultAccountByUserId(userId);
    
    if (existingAccount) {
      return existingAccount;
    }

    // Créer un nouveau compte par défaut
    const newAccount = new this.accountModel({
      user: userId,
      balance: 0,
      currency: 'TND',
      isDefault: true
    });

    return newAccount.save();
  }
*/

  // Récupérer le solde du compte par ID utilisateur
  async getAccountBalance(userId: string): Promise<number> {
    const account = await this.findDefaultAccountByUserId(userId);
    return account.balance;
  }

  // Mettre à jour le solde du compte
  async updateAccountBalance(
    userId: string, 
    amount: number, 
    operation: 'credit' | 'debit' = 'credit'
  ): Promise<Account> {
    const account = await this.findDefaultAccountByUserId(userId);

    if (operation === 'credit') {
      account.balance += amount;
    } else {
      // Vérifier si le solde est suffisant pour le débit
      if (account.balance < amount) {
        throw new Error('Solde insuffisant');
      }
      account.balance -= amount;
    }

    return account.save();
  }

  /*
  // Trouver le compte par défaut d'un utilisateur
  async findDefaultAccountByUserId(userId: string): Promise<AccountDocument> {
    const account = await this.accountModel
      .findOne({ user: userId, isDefault: true })
      .exec();
    
    if (!account) {
      throw new NotFoundException(`Aucun compte par défaut trouvé pour l'utilisateur ${userId}`);
    }
    
    return account;
  }*/

    /*
    async getTotalBalanceByUserId(userId: string): Promise<number> {
      try {
        // Find all accounts for the user
        const accounts = await this.accountModel.find({ 
          user: userId 
        }).exec();
        
        if (accounts.length === 0) {
          return 0; // No accounts found
        }
  
        // Calculate total balance with currency conversion
        const totalBalance = accounts.reduce((total, account) => {
          switch (account.currency) {
            case 'TND':
              return total + account.balance;
            case 'USD':
              // Use a consistent conversion rate
              return total + (account.balance * 3.3);
            default:
              return total;
          }
        }, 0);
  
        return Number(totalBalance.toFixed(2));
      } catch (error) {
        console.error('Error calculating total balance:', error);
        return 0;
      }
    }*/



    async getTotalBalanceByUserId(userId: string): Promise<number> {
      try {
        // Convert userId to ObjectId if needed
        const userObjectId = new Types.ObjectId(userId);
  
        // Find all accounts for the user
        const accounts = await this.accountModel.find({ 
          user: userObjectId 
        }).exec();
        
        if (accounts.length === 0) {
          return 0; // No accounts found
        }
  
        // Calculate total balance with currency conversion
        const totalBalance = accounts.reduce((total, account) => {
          const balance = account.balance;
          switch (account.currency) {
            case 'TND':
              return total + balance;
            case 'USD':
              // Use a consistent conversion rate
              return total + (balance * 3.3);
            default:
              return total;
          }
        }, 0);
  
        return Number(totalBalance.toFixed(2));
      } catch (error) {
        console.error('Error calculating total balance:', error);
        return 0;
      }
    }
  
    async createDefaultAccount(userId: string): Promise<Account> {
      try {
        // Convert userId to ObjectId
        const userObjectId = new Types.ObjectId(userId);
  
        // Check if a default account already exists
        const existingAccount = await this.accountModel.findOne({ 
          user: userObjectId, 
          isDefault: true 
        }).exec();
        
        if (existingAccount) {
          return existingAccount;
        }
  
        // Create a new default account
        const newAccount = new this.accountModel({
          user: userObjectId,
          balance: 0,
          currency: 'TND',
          isDefault: true,
          type: 'checking',
          status: 'active',
          rib: `RIB-${userId}-${Date.now()}`,
          number: `ACC-${userId}-${Date.now()}`
        });
  
        return newAccount.save();
      } catch (error) {
        console.error('Error creating default account:', error);
        throw error;
      }
    }
  
    async findDefaultAccountByUserId(userId: string): Promise<Account | null> {
      try {
        // Convert userId to ObjectId
        const userObjectId = new Types.ObjectId(userId);
  
        return await this.accountModel.findOne({ 
          user: userObjectId, 
          isDefault: true 
        }).exec();
      } catch (error) {
        console.error('Error finding default account:', error);
        return null;
      }
    }

    async getDefaultAccountByUser(userId: string): Promise<Account | null> {
      const userObjectId = new Types.ObjectId(userId);
    
      return await this.accountModel.findOne({
        user: userObjectId,
        isDefault: true,
      }).exec();
    }
    
  }