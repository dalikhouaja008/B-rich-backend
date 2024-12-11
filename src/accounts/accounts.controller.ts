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
  HttpCode,
  NotFoundException,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { Account } from './schemas/account.schema';
import { AuthGuard } from '@nestjs/passport';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  async create(@Body() createAccountDto: Partial<Account>): Promise<Account> {
    return this.accountsService.create(createAccountDto);
  }

  @Get()
  async findAll(): Promise<Account[]> {
    return this.accountsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Account> {
    return this.accountsService.findOne(id);
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

  @Get('rib/:rib')
  @UseGuards(AuthGuard('jwt'))
  async findByRIB(@Param('rib') rib: string, @Req() req: any): Promise<Account> {
    const userId = req.user.id;
    return this.accountsService.findByRIB(rib, userId);
  }

  @Patch('rib/:rib/nickname')
  @UseGuards(AuthGuard('jwt'))
  async updateNicknameByRIB(
    @Param('rib') rib: string,
    @Body('nickname') nickname: string,
    @Req() req: any,
  ): Promise<Account> {
    const userId = req.user.id;
    return this.accountsService.updateNicknameByRIB(rib, nickname, userId);
  }

  @Post('user/:userId')
  @UseGuards(AuthGuard('jwt'))
  async createAccountForUser(
    @Param('userId') userId: string,
    @Body() createAccountDto: Partial<Account>,
  ): Promise<Account> {
    return this.accountsService.create(createAccountDto, userId);
  }

  @Get('user/:userId')
  @UseGuards(AuthGuard('jwt'))
  async getAccountsByUser(@Param('userId') userId: string): Promise<Account[]> {
    return this.accountsService.findByUser(userId);
  }

  @Post('send-otp')
  @UseGuards(AuthGuard('jwt'))
  async sendOtp(@Req() req: any): Promise<{ message: string }> {
    const userEmail = req.user.email;
    if (!userEmail) {
      throw new UnauthorizedException('User email not found in token.');
    }

    const otp = this.accountsService.generateOtp();
    await this.accountsService.sendOtpToEmail(userEmail, otp);

    return { message: 'OTP sent successfully.' };
  }
}
