import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards,Request  } from '@nestjs/common';
import { SolanaService } from './solana.service';
import { createWalletDto } from './dto/create-wallet.dto';
import { UpdateSolanaDto } from './dto/update-solana.dto';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from 'src/guards/jwtAuth.guard';

@Controller('solana')
export class SolanaController {
  constructor(private readonly solanaService: SolanaService) {}

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
