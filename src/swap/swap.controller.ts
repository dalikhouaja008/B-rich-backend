// swap.controller.ts
import { Controller, Post, Body, UseGuards, Request, Get, BadRequestException, Param, NotFoundException } from '@nestjs/common';
import { SwapService } from './swap.service';
import { JwtAuthGuard } from '../guards/jwtAuth.guard';
import { InjectModel } from '@nestjs/mongoose';
import { Wallet } from 'src/solana/schemas/wallet.schema';
import { SolanaService } from 'src/solana/solana.service';
import { Model } from 'mongoose';
import { Keypair } from '@solana/web3.js';
import { SwapDto } from './dto/swap.dto';

@Controller('swap')
export class SwapController {
    constructor(
        
        @InjectModel(Wallet.name) private WalletModel: Model<Wallet>,
        private readonly swapService: SwapService) {}
    @Get('tokens')
    async getAllTokens() {
        return this.swapService.getAvailableTokens();
    }

    @Get('tokens/:mint')
    async getTokenInfo(@Param('mint') mint: string) {
        const token = await this.swapService.getTokenByMint(mint);
        if (!token) {
            throw new NotFoundException(`Token ${mint} not found`);
        }
        return token;
    }

    @Get('pairs')
    async getAvailablePairs() {
        return this.swapService.getAvailablePairs();
    }

    @Post('quote')
    async getQuote(@Body() quoteDto: {
        fromSymbol: string;
        toSymbol: string;
        amount: number;
        slippage: number;
    }) {
        return this.swapService.getSwapQuote(quoteDto);
    }

    @Post('prepare')
    async executeSwap(@Body() swapDto: SwapDto) {
      return this.swapService.swap(swapDto);
    }

    @Get('status/:signature')
    async checkTransactionStatus(@Param('signature') signature: string) {
      return this.swapService.checkTransactionStatus(signature);
    }

   /* @Post('retry')
    @UseGuards(JwtAuthGuard)
    async retrySwap(
      @Request() req,
      @Body() swapParams: {
        inputMint: string;
        outputMint: string;
        amount: number;
        slippage: number;
      }
    ) {
      return this.swapService.retrySwap({
        userPublicKey: req.user.publicKey,
        ...swapParams
      });
    }*/

}