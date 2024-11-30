import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards,Request  } from '@nestjs/common';
import { SolanaService } from './solana.service';
import { createWalletDto } from './dto/create-wallet.dto';
import { UpdateSolanaDto } from './dto/update-solana.dto';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from 'src/guards/jwtAuth.guard';

@Controller('solana')
export class SolanaController {
  constructor(private readonly solanaService: SolanaService) {}

  @Post('create-wallet')
  @UseGuards(JwtAuthGuard) // Protection par authentification
  async createWallet(@Request() req) {
    const createWalletDto: createWalletDto = {
      userId: req.user.id // Récupérer l'ID de l'utilisateur connecté
    };
    return this.solanaService.createWallet(createWalletDto);
  }


  @Get('wallet/:publicKey/balance')
  async getWalletBalance(@Param('publicKey') publicKey: string) {
    return this.solanaService.syncWalletBalance(publicKey);
  }

  @Post('send-transaction')
  async sendTransaction(
    @Body('fromPublicKey') fromPublicKey: string,
    @Body('fromSecretKey') fromSecretKey: Uint8Array,
    @Body('toPublicKey') toPublicKey: string,
    @Body('amount') amount: number
  ) {
    return this.solanaService.sendTransaction(
      fromPublicKey, 
      fromSecretKey, 
      toPublicKey, 
      amount
    );
  }
  @Post('/link-phantom')
  @UseGuards(JwtAuthGuard)
  async linkPhantomWallet(
    @Request() req,
    @Body('phantomPublicKey') phantomPublicKey: string
  ) {
    return this.solanaService.linkPhantomWallet(
      req.user.id, 
      phantomPublicKey
    );
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
