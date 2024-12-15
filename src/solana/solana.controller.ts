import { Controller, Get, Post, Body, Param, UseGuards, Request, Patch, Delete } from '@nestjs/common';
import { SolanaService } from './solana.service';
import { createWalletDto } from './dto/create-wallet.dto';
import { UpdateSolanaDto } from './dto/update-solana.dto';
import { JwtAuthGuard } from 'src/guards/jwtAuth.guard';
import { AuthorizationGuard } from 'src/guards/authorization.guard';

@Controller('solana')
export class SolanaController {
  constructor(private readonly solanaService: SolanaService) {}

  // Fetch user wallets by user ID (accessible by admin or user with permissions)
  @Get('user-wallets/:userId')
  @UseGuards(AuthorizationGuard) // Guard to protect access for admins
  async getUserWallets(@Param('userId') userId: string) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const wallets = await this.solanaService.getUserWallets(userId);
      if (!wallets || wallets.length === 0) {
        throw new Error('No wallets found for this user');
      }
      return wallets;
    } catch (error) {
      console.error('Error in getUserWallets: ', error.message);
      throw error;
    }
  }

  // Create a new currency wallet for the authenticated user
  @Post('create-currency-wallet')
  @UseGuards(JwtAuthGuard)
  async createCurrencyWallet(
    @Request() req,
    @Body('currency') currency: string,
    @Body('amount') amount: number
  ) {
    return this.solanaService.createCurrencyWallet(
      {
        userId: req.user.id,
        type: ''
      },
      currency,
      amount
    );
  }

  // Fetch the balance of a specific wallet
  @Get('wallet/:publicKey/balance')
  @UseGuards(JwtAuthGuard)
  async getWalletBalance(@Request() req, @Param('publicKey') publicKey: string) {
    return this.solanaService.syncWalletBalances(req.user.id, publicKey);
  }

  // Transfer funds between two wallets
  @Post('transfer-between-wallets')
  @UseGuards(JwtAuthGuard)
  async transferBetweenWallets(
    @Request() req,
    @Body('fromWalletPublicKey') fromWalletPublicKey: string,
    @Body('toWalletPublicKey') toWalletPublicKey: string,
    @Body('amount') amount: number
  ) {
    return this.solanaService.transferBetweenWallets(
      req.user.id,
      fromWalletPublicKey,
      toWalletPublicKey,
      amount
    );
  }

  // Convert currency from one type to another
  @Post('convert-currency')
  @UseGuards(JwtAuthGuard)
  async convertCurrency(
    @Request() req,
    @Body('amount') amount: number,
    @Body('fromCurrency') fromCurrency: string
  ) {
    return this.solanaService.convertCurrency(
      req.user.id,
      amount,
      fromCurrency
    );
  }

  // Fetch all wallets for the authenticated user
  @Get('my-wallets')
  @UseGuards(JwtAuthGuard)
  async getMyWallets(@Request() req) {
    return this.solanaService.getUserWallets(req.user.id);
  }

  // Create a new wallet (general endpoint)
  @Post()
  create(@Body() createWalletDto: createWalletDto) {
    return this.solanaService.create(createWalletDto);
  }

  // Fetch all wallets (admin access or general query)
  @Get()
  findAll() {
    return this.solanaService.findAll();
  }

  // Find a specific wallet by ID (general lookup)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.solanaService.findOne(+id);
  }

  // Update wallet information
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSolanaDto: UpdateSolanaDto) {
    return this.solanaService.update(+id, updateSolanaDto);
  }

  // Remove a wallet by ID (admin or authorized user)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.solanaService.remove(+id);
  }
}
