// swap.controller.ts
import { Controller, Post, Body, UseGuards, Request, Get, BadRequestException, Param, NotFoundException } from '@nestjs/common';
import { SwapService } from './swap.service';
import { JwtAuthGuard } from '../guards/jwtAuth.guard';
import { InjectModel } from '@nestjs/mongoose';
import { Wallet } from 'src/solana/schemas/wallet.schema';
import { SolanaService } from 'src/solana/solana.service';
import { Model } from 'mongoose';
import { Keypair } from '@solana/web3.js';

@Controller('swap')
export class SwapController {
    constructor(
        private readonly solanaService: SolanaService,
        @InjectModel(Wallet.name) private WalletModel: Model<Wallet>,
        private readonly swapService: SwapService) {}
    @Get('tokens')
    async getAllTokens() {
        return this.swapService.getAllTokens();
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
        inputMint: string;
        outputMint: string;
        amount: number;
        slippage: number;
    }) {
        return this.swapService.getSwapQuote(quoteDto);
    }

    @UseGuards(JwtAuthGuard)
    @Post('execute')
    async executeSwap(@Body() swapDto: {
        userPublicKey: string;
        inputMint: string;
        outputMint: string;
        amount: number;
        slippage: number;
    }) {
        return this.swapService.swap(swapDto);
    }

}