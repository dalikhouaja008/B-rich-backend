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
} from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { Account } from './schemas/account.schema';
import { CreateAccountDto } from './dtos/create-account.dto';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

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
}
