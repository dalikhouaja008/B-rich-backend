import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  NotFoundException,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { Account } from './schemas/account.schema';
import { CreateAccountDto } from './dtos/create-account.dto';
import { JwtAuthGuard } from 'src/guards/jwtAuth.guard';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  /*
  @Get('total-balance/:userId')
  async getTotalBalance(@Param('userId') userId: string): Promise<{ totalBalance: number }> {
    const totalBalance = await this.accountsService.getTotalBalanceByUserId(userId);
    return { totalBalance };
  }*/

  @Get('user/:userId')
  async findDefaultAccountByUserId(@Param('userId') userId: string): Promise<Account> {
    return this.accountsService.findDefaultAccountByUserId(userId);
  }

  @Post()
  async create(@Body() createAccountDto: CreateAccountDto): Promise<Account> {
    return this.accountsService.create(createAccountDto);
  }

  @Get()
  async findAll(): Promise<Account[]> {
    return this.accountsService.findAll();
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateAccountDto: Partial<Account>,
  ): Promise<Account> {
    return this.accountsService.update(id, updateAccountDto);
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(@Param('id') id: string): Promise<void> {
    return this.accountsService.delete(id);
  }


  // Endpoint pour créer un compte par défaut
  @Post('create/:userId')
  @HttpCode(HttpStatus.CREATED)
  async createAccount(@Param('userId') userId: string) {
    return this.accountsService.createDefaultAccount(userId);
  }

  /*
  // Endpoint pour récupérer le solde du compte
  @Get('balance/:userId')
  @HttpCode(HttpStatus.OK)
  async getAccountBalance(@Param('userId') userId: string) {
    const balance = await this.accountsService.getAccountBalance(userId);
    return { 
      userId, 
      balance 
    };
  }*/

  // Endpoint pour mettre à jour le solde
  @Post('update/:userId')
  @HttpCode(HttpStatus.OK)
  async updateBalance(
    @Param('userId') userId: string,
    @Body() body: { amount: number, operation: 'credit' | 'debit' }
  ) {
    return this.accountsService.updateAccountBalance(
      userId, 
      body.amount, 
      body.operation
    );
  }

  @Post('create-default/:userId')
  async createDefaultAccount(@Param('userId') userId: string) {
    return this.accountsService.createDefaultAccount(userId);
  }

  @Get('balance/:userId')
  async getAccountBalance(@Param('userId') userId: string) {
    const balance = await this.accountsService.getAccountBalance(userId);
    return { userId, balance };
  }

  @Get('/default-balance/:userId')
  async getDefaultAccountBalance(@Param('userId') userId: string) {
    const account = await this.accountsService.findDefaultAccountByUserId(userId);
    if (!account) {
      return { balance: 0 }; // ou renvoyer un message d'erreur
    }
    return { balance: account.balance };
  }


@Get('total-balance/:userId')
  async getTotalBalance(@Param('userId') userId: string): Promise<{ totalBalance: number }> {
    try {
      const totalBalance = await this.accountsService.getTotalBalanceByUserId(userId);
      return { totalBalance };
    } catch (error) {
      console.error('Error in getTotalBalance:', error);
      return { totalBalance: 0 };
    }
  }


  @Get('default-account')
@UseGuards(JwtAuthGuard)
async getDefaultAccountByUser(@Request() req) {
  const userId = req.user.id; // Extrait correctement l'ID utilisateur
  const defaultAccount = await this.accountsService.getDefaultAccountByUser(userId);

  if (!defaultAccount) {
    throw new NotFoundException('Default account not found');
  }

  return defaultAccount;
}
}
