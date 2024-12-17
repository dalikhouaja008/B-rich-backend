import { Test, TestingModule } from '@nestjs/testing';
import { AccountsService } from './accounts.service';
import { getModelToken } from '@nestjs/mongoose';
import { Account, AccountDocument } from './entities/account.entity';
import { Model, Types } from 'mongoose';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';

describe('AccountsService', () => {
  let service: AccountsService;
  let model: Model<AccountDocument>;

  const mockAccount = {
    _id: new Types.ObjectId(),
    number: '123456789',
    type: 'savings',
    RIB: 'FR123456789',
    status: 'active',
    balance: 1000,
    nickname: null,
    user: null,
    isDefault: false,
  };

  const mockUser = {
    _id: new Types.ObjectId(),
    email: 'test@example.com',
  };

  const mockAccountModel = {
    new: jest.fn(),
    constructor: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    save: jest.fn(),
    exec: jest.fn(),
    updateMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        {
          provide: getModelToken(Account.name),
          useValue: mockAccountModel,
        },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
    model = module.get<Model<AccountDocument>>(getModelToken(Account.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createWithoutUser', () => {
    it('should create an account without user association', async () => {
      const accountData = {
        number: '123456789',
        type: 'savings',
        RIB: 'FR123456789',
        status: 'active',
        balance: 1000,
      };

      const savedAccount = { ...accountData, _id: new Types.ObjectId() };
      jest.spyOn(model.prototype, 'save').mockResolvedValue(savedAccount);

      const result = await service.createWithoutUser(accountData);

      expect(result).toEqual(savedAccount);
      expect(model.prototype.save).toHaveBeenCalled();
    });
  });

  describe('createWithUser', () => {
    it('should create an account with user association', async () => {
      const accountData = {
        number: '123456789',
        type: 'savings',
        RIB: 'FR123456789',
        status: 'active',
        balance: 1000,
      };

      mockAccountModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      const savedAccount = {
        ...accountData,
        _id: new Types.ObjectId(),
        user: mockUser._id,
        isDefault: true,
      };
      jest.spyOn(model.prototype, 'save').mockResolvedValue(savedAccount);

      const result = await service.createWithUser(accountData, mockUser._id.toString());

      expect(result).toEqual(savedAccount);
      expect(model.prototype.save).toHaveBeenCalled();
      expect(savedAccount.isDefault).toBe(true); // Should be default as it's the first account
    });
  });

  describe('findAll', () => {
    it('should return all accounts', async () => {
      const accounts = [mockAccount];
      mockAccountModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(accounts),
      });

      const result = await service.findAll();

      expect(result).toEqual(accounts);
      expect(mockAccountModel.find).toHaveBeenCalled();
    });
  });

  describe('findByUser', () => {
    it('should return all accounts for a specific user', async () => {
      const userAccounts = [{ ...mockAccount, user: mockUser._id }];
      mockAccountModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(userAccounts),
      });

      const result = await service.findByUser(mockUser._id.toString());

      expect(result).toEqual(userAccounts);
      expect(mockAccountModel.find).toHaveBeenCalledWith({
        user: expect.any(Types.ObjectId),
      });
    });
  });

  describe('findOne', () => {
    it('should return an account by ID', async () => {
      mockAccountModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAccount),
      });

      const result = await service.findOne(mockAccount._id.toString());

      expect(result).toEqual(mockAccount);
      expect(mockAccountModel.findById).toHaveBeenCalledWith(mockAccount._id);
    });

    it('should throw NotFoundException when account not found', async () => {
      mockAccountModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findOne('nonexistentid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('associateWithUserAndUpdateNickname', () => {
    it('should associate account with user and update nickname', async () => {
      const unassignedAccount = { ...mockAccount, save: jest.fn() };
      mockAccountModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(unassignedAccount),
      });

      mockAccountModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]), // No existing user accounts
      });

      unassignedAccount.save.mockResolvedValue({
        ...unassignedAccount,
        user: mockUser._id,
        nickname: 'My Account',
        isDefault: true,
      });

      const result = await service.associateWithUserAndUpdateNickname(
        'FR123456789',
        'My Account',
        mockUser._id.toString(),
      );

      expect(result.user).toEqual(mockUser._id);
      expect(result.nickname).toBe('My Account');
      expect(result.isDefault).toBe(true);
      expect(unassignedAccount.save).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when account is already owned', async () => {
      const ownedAccount = {
        ...mockAccount,
        user: new Types.ObjectId(), // Different user ID
      };
      mockAccountModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(ownedAccount),
      });

      await expect(
        service.associateWithUserAndUpdateNickname(
          'FR123456789',
          'My Account',
          mockUser._id.toString(),
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('updateDefaultStatus', () => {
    it('should update account default status', async () => {
      const account = {
        ...mockAccount,
        user: mockUser._id,
        save: jest.fn(),
      };

      mockAccountModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(account),
      });

      mockAccountModel.updateMany.mockReturnValue({
        exec: jest.fn().mockResolvedValue({}),
      });

      account.save.mockResolvedValue({ ...account, isDefault: true });

      const result = await service.updateDefaultStatus(
        'FR123456789',
        mockUser._id.toString(),
      );

      expect(result.isDefault).toBe(true);
      expect(mockAccountModel.updateMany).toHaveBeenCalled();
      expect(account.save).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user does not own the account', async () => {
      const account = {
        ...mockAccount,
        user: new Types.ObjectId(), // Different user ID
      };

      mockAccountModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(account),
      });

      await expect(
        service.updateDefaultStatus('FR123456789', mockUser._id.toString()),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('updateBalance', () => {
    it('should update account balance', async () => {
      const account = {
        ...mockAccount,
        user: mockUser._id,
        save: jest.fn(),
      };

      mockAccountModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(account),
      });

      account.save.mockResolvedValue({ ...account, balance: 2000 });

      const result = await service.updateBalance(
        'FR123456789',
        2000,
        mockUser._id.toString(),
      );

      expect(result.balance).toBe(2000);
      expect(account.save).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user does not own the account', async () => {
      const account = {
        ...mockAccount,
        user: new Types.ObjectId(), // Different user ID
      };

      mockAccountModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(account),
      });

      await expect(
        service.updateBalance('FR123456789', 2000, mockUser._id.toString()),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('delete', () => {
    it('should delete an account', async () => {
      const account = {
        ...mockAccount,
        user: mockUser._id,
      };

      mockAccountModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(account),
      });

      mockAccountModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue({}),
      });

      await service.delete(mockAccount._id.toString(), mockUser._id.toString());

      expect(mockAccountModel.findByIdAndDelete).toHaveBeenCalledWith(mockAccount._id);
    });

    it('should throw UnauthorizedException when user does not own the account', async () => {
      const account = {
        ...mockAccount,
        user: new Types.ObjectId(), // Different user ID
      };

      mockAccountModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(account),
      });

      await expect(
        service.delete(mockAccount._id.toString(), mockUser._id.toString()),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});