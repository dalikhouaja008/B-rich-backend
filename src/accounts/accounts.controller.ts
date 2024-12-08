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
  NotFoundException,
} from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { Account } from './schemas/account.schema';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  // Create a new account
  @Post()
  async create(@Body() createAccountDto: Partial<Account>): Promise<Account> {
    return this.accountsService.create(createAccountDto);
  }

  // Fetch all accounts
  @Get()
  async findAll(): Promise<Account[]> {
    return this.accountsService.findAll();
  }

  // Fetch account by ID
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
  @HttpCode(204) // No content
  async delete(@Param('id') id: string): Promise<void> {
    return this.accountsService.delete(id);
  }

  // Fetch account by RIB
  @Get('rib/:rib')
  async findByRIB(@Param('rib') rib: string): Promise<Account> {
    const account = await this.accountsService.findByRIB(rib);
    if (!account) {
      throw new NotFoundException(`Account with RIB ${rib} not found`);
    }
    return account;
  }

  // Update nickname by RIB
  @Patch('rib/:rib/nickname')
  async updateNicknameByRIB(
    @Param('rib') rib: string,
    @Body('nickname') nickname: string,
  ): Promise<Account> {
    const account = await this.accountsService.updateNicknameByRIB(rib, nickname);
    if (!account) {
      throw new NotFoundException(`Account with RIB ${rib} not found`);
    }
    return account;
  }
}