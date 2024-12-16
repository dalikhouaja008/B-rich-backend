import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpStatus,
  HttpException
} from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dtos/create-account.dto';
import { JwtAuthGuard } from '../guards/jwtAuth.guard';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  // Create account without user association
  @Post()
  async create(@Body() createAccountDto: CreateAccountDto) {
    try {
      return await this.accountsService.create(createAccountDto);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create account',
        error.status || HttpStatus.BAD_REQUEST
      );
    }
  }

  // Get account by RIB
  @Get('rib/:rib')
  async findByRib(@Param('rib') rib: string) {
    try {
      return await this.accountsService.findByRib(rib);
    } catch (error) {
      throw new HttpException(
        error.message || 'Account not found',
        error.status || HttpStatus.NOT_FOUND
      );
    }
  }

  // Update nickname and associate with user
  @Put('rib/:rib/nickname')
  @UseGuards(JwtAuthGuard)
  async updateNickname(
    @Request() req,
    @Param('rib') rib: string,
    @Body('nickname') nickname: string
  ) {
    try {
      return await this.accountsService.updateNickname(rib, nickname, req.user.userId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update nickname',
        error.status || HttpStatus.BAD_REQUEST
      );
    }
  }

  // Get user's accounts
  @Get('user')
  @UseGuards(JwtAuthGuard)
  async findUserAccounts(@Request() req) {
    try {
      return await this.accountsService.findByUserId(req.user.userId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch accounts',
        error.status || HttpStatus.BAD_REQUEST
      );
    }
  }

  // Update account balance
  @Put('rib/:rib/balance')
  async updateBalance(
    @Param('rib') rib: string,
    @Body('balance') balance: number
  ) {
    try {
      return await this.accountsService.updateBalance(rib, balance);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update balance',
        error.status || HttpStatus.BAD_REQUEST
      );
    }
  }

  // Delete account
  @Delete('rib/:rib')
  async delete(@Param('rib') rib: string) {
    try {
      return await this.accountsService.delete(rib);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to delete account',
        error.status || HttpStatus.BAD_REQUEST
      );
    }
  }

  // Get account by ID
  @Get(':id')
  async findById(@Param('id') id: string) {
    try {
      return await this.accountsService.findById(id);
    } catch (error) {
      throw new HttpException(
        error.message || 'Account not found',
        error.status || HttpStatus.NOT_FOUND
      );
    }
  }

  // Update account
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateAccountDto: Partial<CreateAccountDto>
  ) {
    try {
      return await this.accountsService.update(id, updateAccountDto);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update account',
        error.status || HttpStatus.BAD_REQUEST
      );
    }
  }
}