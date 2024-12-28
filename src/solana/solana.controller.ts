import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards,Request, Query  } from '@nestjs/common';
import { SolanaService } from './solana.service';
import { createWalletDto } from './dto/create-wallet.dto';
import { UpdateSolanaDto } from './dto/update-solana.dto';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from 'src/guards/jwtAuth.guard';


@Controller('solana')
export class SolanaController {
  constructor(private readonly solanaService: SolanaService) {}

  @Post('create-tnd-wallet')
  @UseGuards(JwtAuthGuard)
  async createTNDWallet(
    @Request() req,
    @Body() CreateTNDWalletDto: { amount: number; rib: string }
  ) {
    return this.solanaService.createTNDWallet(
      { userId: req.user.id },
      CreateTNDWalletDto.amount,
      CreateTNDWalletDto.rib
    );
  }
  @Post('create-currency-wallet')
  @UseGuards(JwtAuthGuard)
  async createCurrencyWallet(
    @Request() req,
    @Body('currency') currency: string,
    @Body('amount') amount: number
  ) {
    return this.solanaService.createCurrencyWallet(
      { userId: req.user.id }, 
      currency, 
      amount
    );
  }

  @Post('sync-transactions')
  @UseGuards(JwtAuthGuard)
  async syncWalletTransactions(
    @Request() req,
    @Body('walletPublicKey') walletPublicKey: string
  ) {
    return this.solanaService.syncWalletTransactions(walletPublicKey, req.user.id);
  }

  @Get('transactions/:walletPublicKey')
  @UseGuards(JwtAuthGuard)
  async getWalletTransactions(
    @Request() req,
    @Param('walletPublicKey') walletPublicKey: string,
    @Query('limit') limit?: number,
    @Query('skip') skip?: number
  ) {
    return this.solanaService.getWalletTransactions(
      req.user.id,
      walletPublicKey,
      limit,
      skip
    );
  }


  @Get('wallet/:publicKey/balance')
  @UseGuards(JwtAuthGuard)
  async getWalletBalance(@Request() req,@Param('publicKey') publicKey: string) {
    return this.solanaService.syncWalletBalances(req.user.id, publicKey);
  }

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
   // Convertir une devise
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
  // Lier un wallet Phantom
  /*@Post('link-phantom')
  @UseGuards(JwtAuthGuard)
  async linkPhantomWallet(
    @Request() req, 
    @Body('phantomPublicKey') phantomPublicKey: string
  ) {
    return this.solanaService.linkPhantomWallet(
      req.user.id, 
      phantomPublicKey
    );
  }*/


    // Récupérer tous les wallets d'un utilisateur
    @Get('my-wallets')
    @UseGuards(JwtAuthGuard)
    async getUserWallets(@Request() req) {
      return this.solanaService.getUserWallets(req.user.id);
    }
    @Get('wallets-with-transactions')
    @UseGuards(JwtAuthGuard)
    async getWalletsWithTransactions(@Request() req) {
      return this.solanaService.getWalletsWithTransactions(req.user.id);
    }
    
  @Get('users/wallets-transactions')
  async getUsersWithWalletsAndTransactions(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.solanaService.getUsersWithWalletsAndTransactions(page, limit);
  }

  @Get('user/wallets-transactions/:userId')
  async getUserWalletsAndTransactions(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ) {
    return this.solanaService.getUsersWithWalletsAndTransactions(page, limit);
  }

  @Post()
  create(@Body() createWalletDto: createWalletDto) {
    return this.solanaService.create(createWalletDto);
  }

  @Get()
  findAll() {
    return this.solanaService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.solanaService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSolanaDto: UpdateSolanaDto) {
    return this.solanaService.update(+id, updateSolanaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.solanaService.remove(+id);
  }
}
