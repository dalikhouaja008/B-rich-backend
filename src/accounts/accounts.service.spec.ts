import { Test, TestingModule } from '@nestjs/testing';
import { AccountsService } from './accounts.service';
import { getModelToken } from '@nestjs/mongoose';
import { Account } from './schemas/account.schema';
import { Model } from 'mongoose';
import { CreateAccountDto, AccountType, AccountStatus } from './dtos/create-account.dto';
import { NotFoundException } from '@nestjs/common';

describe('AccountsService', () => {
  let service: AccountsService;
  let model: Model<Account>;

  const mockAccount = {
    id: 'testid123',
    accountNumber: '123456789',
    type: AccountType.SAVINGS,
    status: AccountStatus.ACTIVE,
    rib: 'FR7630001007941234567890185',
    balance: 1000,
    nickname: null,
    userId: null,
    save: jest.fn().mockResolvedValue(this),
    deleteOne: jest.fn().mockResolvedValue({ acknowledged: true, deletedCount: 1 })
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        {
          provide: getModelToken(Account.name),
          useValue: {
            new: jest.fn().mockResolvedValue(mockAccount),
            constructor: jest.fn().mockResolvedValue(mockAccount),
            find: jest.fn(),
            findOne: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            exec: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
    model = module.get<Model<Account>>(getModelToken(Account.name));
  });

  describe('create', () => {
    it('should create an account', async () => {
      const createDto: CreateAccountDto = {
        accountNumber: '123456789',
        type: AccountType.SAVINGS,
        status: AccountStatus.ACTIVE,
        rib: 'FR7630001007941234567890185',
        balance: 1000
      };
      
      jest.spyOn(model, 'create').mockResolvedValue(mockAccount as any);
      const result = await service.create(createDto);
      expect(result).toEqual(mockAccount);
    });
  });

 
  describe('delete', () => {
    it('should delete an account', async () => {
      const deleteResponse = { acknowledged: true, deletedCount: 1 };
      jest.spyOn(model, 'findOne').mockResolvedValue(mockAccount);
      mockAccount.deleteOne.mockResolvedValue(deleteResponse);

      const result = await service.delete('FR7630001007941234567890185');
      expect(result).toEqual(deleteResponse);
    });
  });

  describe('findByRib', () => {
    it('should return an account by RIB', async () => {
      jest.spyOn(model, 'findOne').mockResolvedValue(mockAccount as any);
      const result = await service.findByRib('FR7630001007941234567890185');
      expect(result).toEqual(mockAccount);
    });

    it('should throw NotFoundException if account not found', async () => {
      jest.spyOn(model, 'findOne').mockResolvedValue(null);
      await expect(service.findByRib('invalid-rib')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateNickname', () => {
    it('should update account nickname and userId', async () => {
      const updatedAccount = { ...mockAccount, nickname: 'MyAccount', userId: 'user123' };
      jest.spyOn(model, 'findOne').mockResolvedValue(mockAccount as any);
      mockAccount.save.mockResolvedValue(updatedAccount);

      const result = await service.updateNickname('FR7630001007941234567890185', 'MyAccount', 'user123');
      expect(result).toEqual(updatedAccount);
    });
  });

  describe('updateBalance', () => {
    it('should update account balance', async () => {
      const updatedAccount = { ...mockAccount, balance: 2000 };
      jest.spyOn(model, 'findOne').mockResolvedValue(mockAccount as any);
      mockAccount.save.mockResolvedValue(updatedAccount);

      const result = await service.updateBalance('FR7630001007941234567890185', 2000);
      expect(result.balance).toBe(2000);
    });
  });

  describe('delete', () => {
    it('should delete an account', async () => {
      jest.spyOn(model, 'findOne').mockResolvedValue(mockAccount as any);
      mockAccount.deleteOne.mockResolvedValue({ acknowledged: true, deletedCount: 1 });

      const result = await service.delete('FR7630001007941234567890185');
      expect(result.deletedCount).toBe(1);
    });
  });

  describe('findById', () => {
    it('should return an account by ID', async () => {
      jest.spyOn(model, 'findById').mockResolvedValue(mockAccount as any);
      const result = await service.findById('testid123');
      expect(result).toEqual(mockAccount);
    });

    it('should throw NotFoundException if account not found', async () => {
      jest.spyOn(model, 'findById').mockResolvedValue(null);
      await expect(service.findById('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });
});