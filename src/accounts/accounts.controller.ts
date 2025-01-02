import {
  Controller,
  Get,
  Post,
  Request,
  Body,
  Param,
  Put,
  Delete,
  Patch,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { Account } from './entities/account.entity';
import { CreateAccountDto } from './dtos/create-account.dto';
import { LinkAccountDto } from './dtos/link-account.dto';
import { JwtAuthGuard } from 'src/guards/jwtAuth.guard';

@Controller('accounts')
export class AccountsController {
  private readonly logger = new Logger(AccountsController.name);
  
  constructor(private readonly accountsService: AccountsService) {}


  // Get all accounts by user ID
  @Get('user')
  @UseGuards(JwtAuthGuard)
  async findAllByUser(@Request() req): Promise<Account[]> {
    return this.accountsService.findAllByUser(req.user.id);
  }
  // Get account by RIB
  @Get('rib/:rib')
  async findByRIB(@Param('rib') rib: string): Promise<Account> {
    return this.accountsService.findByRIB(rib);
  }
  //link acount to user 
  @Post('link')
  @UseGuards(JwtAuthGuard)
  async linkAccount(
      @Request() req,
      @Body() linkAccountDto: LinkAccountDto
  ): Promise<Account> {
      this.logger.log(`Linking account request received: ${JSON.stringify(linkAccountDto)}`);
      
      if (!req.user.id) {
          throw new BadRequestException('User ID is required');
      }
  
      const result = await this.accountsService.linkAccount(
          linkAccountDto.rib,
          linkAccountDto.nickname,
          req.user.id
      );
  
      this.logger.log('Link account result:', result);
      return result;
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
  @Get('my/default')
  @UseGuards(JwtAuthGuard)
  async getDefaultAccount(@Request() req): Promise<Account> {
      // Ajout de logs pour debug
      console.log('Request user:', req.user);
      
      // Vérification de toutes les possibilités pour obtenir l'ID
      const userId = req.user._id || req.user.id || req.user.userId;
      
      if (!userId) {
          console.log('User data in request:', req.user);
          throw new BadRequestException('User ID not found in request');
      }

      return this.accountsService.getDefaultAccount(userId);
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

    // Create account
    @Post()
    async create(@Body() createAccountDto: CreateAccountDto): Promise<Account> {
      return this.accountsService.create(createAccountDto);
    }
    @Get()
    @UseGuards(JwtAuthGuard)
    async findAll(@Request() req,): Promise<Account[]> {
      return this.accountsService.findAll()
    }
}