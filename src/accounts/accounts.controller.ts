import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Patch,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { Account } from './entities/account.entity';
import { CreateAccountDto } from './dtos/create-account.dto';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  // Create account
  @Post()
  async create(@Body() createAccountDto: CreateAccountDto): Promise<Account> {
    return this.accountsService.create(createAccountDto);
  }

  // Get all accounts
  @Get()
  async findAll(): Promise<Account[]> {
    return this.accountsService.findAll();
  }

  // Get account by ID
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Account> {
    return this.accountsService.findOne(id);
  }

  // Update account by ID
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateAccountDto: Partial<Account>,
  ): Promise<Account> {
    return this.accountsService.update(id, updateAccountDto);
  }

  // Delete account by ID
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    return this.accountsService.delete(id);
  }

  // Get account by RIB
  @Get('rib/:rib')
  async findByRIB(@Param('rib') rib: string): Promise<Account> {
    return this.accountsService.findByRIB(rib);
  }

  // Update account nickname
  @Patch('nickname/:rib')
  async updateNickname(
    @Param('rib') rib: string,
    @Body('nickname') nickname: string,
  ): Promise<Account> {
    return this.accountsService.updateNickname(rib, nickname);
  }

  // Set account as default
  @Patch('default/:rib')
  async setDefaultAccount(@Param('rib') rib: string): Promise<Account> {
    return this.accountsService.updateDefaultStatus(rib);
  }

  // Get default account
  @Get('default')
  async getDefaultAccount(): Promise<Account> {
    return this.accountsService.getDefaultAccount();
  }

  // Update account balance
  @Patch('balance/:rib')
  async updateBalance(
    @Param('rib') rib: string,
    @Body('amount') amount: number,
  ): Promise<Account> {
    return this.accountsService.updateBalance(rib, amount);
  }

  // Get dashboard metrics
  @Get('dashboard/metrics')
  async getDashboardMetrics() {
    return this.accountsService.getDashboardMetrics();
  }

  // Get account details by ID
  @Get(':id/details')
  async getAccountDetails(@Param('id') id: string) {
    return this.accountsService.getAccountDetails(id);
  }
}