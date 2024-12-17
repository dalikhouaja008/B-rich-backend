import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Patch,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AccountsService } from './accounts.service';
import { Account } from './entities/account.entity';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  // Create account without user association
  @Post('create-unassigned')
  async createWithoutUser(@Body() createAccountDto: Partial<Account>): Promise<Account> {
    return this.accountsService.createWithoutUser(createAccountDto);
  }

  // Create account with user association
  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(
    @Body() createAccountDto: Partial<Account>,
    @Req() req: any,
  ): Promise<Account> {
    return this.accountsService.createWithUser(createAccountDto, req.user.id);
  }

  // Get all accounts (admin only - you might want to add an admin guard)
  @Get()
  //@UseGuards(AuthGuard('jwt'))
  async findAll(): Promise<Account[]> {
    return this.accountsService.findAll();
  }

  // Get user's accounts
  @Get('my-accounts')
  @UseGuards(AuthGuard('jwt'))
  async findMyAccounts(@Req() req: any): Promise<Account[]> {
    return this.accountsService.findByUser(req.user.id);
  }

  // Get account by ID
  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  async findOne(@Param('id') id: string): Promise<Account> {
    return this.accountsService.findOne(id);
  }

  // Update account
  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  async update(
    @Param('id') id: string,
    @Body() updateAccountDto: Partial<Account>,
    @Req() req: any,
  ): Promise<Account> {
    return this.accountsService.update(id, updateAccountDto, req.user.id);
  }

  // Delete account
  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @Req() req: any): Promise<void> {
    return this.accountsService.delete(id, req.user.id);
  }

  // Associate account with user and update nickname
  @Patch('associate/:rib')
  @UseGuards(AuthGuard('jwt'))
  async associateWithUserAndUpdateNickname(
    @Param('rib') rib: string,
    @Body('nickname') nickname: string,
    @Req() req: any,
  ): Promise<Account> {
    return this.accountsService.associateWithUserAndUpdateNickname(
      rib,
      nickname,
      req.user.id,
    );
  }

  // Get account by RIB
  @Get('rib/:rib')
  @UseGuards(AuthGuard('jwt'))
  async findByRIB(@Param('rib') rib: string): Promise<Account> {
    return this.accountsService.findByRIB(rib);
  }

  // Set account as default
  @Patch('default/:rib')
  @UseGuards(AuthGuard('jwt'))
  async setDefaultAccount(
    @Param('rib') rib: string,
    @Req() req: any,
  ): Promise<Account> {
    return this.accountsService.updateDefaultStatus(rib, req.user.id);
  }

  // Get user's default account
  @Get('default/my-account')
  @UseGuards(AuthGuard('jwt'))
  async getDefaultAccount(@Req() req: any): Promise<Account> {
    return this.accountsService.getDefaultAccount(req.user.id);
  }

  // Update account balance
  @Patch('balance/:rib')
  @UseGuards(AuthGuard('jwt'))
  async updateBalance(
    @Param('rib') rib: string,
    @Body('amount') amount: number,
    @Req() req: any,
  ): Promise<Account> {
    return this.accountsService.updateBalance(rib, amount, req.user.id);
  }
  
  @Get('dashboard')
  async getDashboard() {
    return this.accountsService.getDashboardMetrics();
  }

  @Get(':id/details')
  async getAccountDetails(@Param('id') id: string) {
    return this.accountsService.getAccountDetails(id);
  }
}