import { Controller, Post, Body, HttpCode, UseGuards, Request, BadRequestException, Logger, Get, Param, Patch, Delete } from '@nestjs/common';
import { SwapService } from './swap.service';
import { SwapDto } from './dto/swap.dto';
import { JwtAuthGuard } from 'src/guards/jwtAuth.guard';
import { Decimal } from 'decimal.js';
import { InjectModel } from '@nestjs/mongoose';
import { SolanaService } from 'src/solana/solana.service';
import { Model } from 'mongoose';
import { Wallet } from 'src/solana/schemas/wallet.schema';
import { getPoolAddress, getPoolName, getTokenFromPool } from 'src/orca/pool';
import { Connection, Keypair } from '@solana/web3.js';
import { getNetwork } from 'src/orca/solana.utils';
import { CONFIG } from 'src/orca/config';
import { getSlippage, hasEnoughFunds } from 'src/orca/orca-utils';
import { getOrca, Network, OrcaPoolConfig, OrcaPool } from '@orca-so/sdk';

@Controller('swap')
export class SwapController {
  private readonly connection: Connection;
  private readonly logger = new Logger(SwapController.name);

  constructor(
    private readonly solanaService: SolanaService,
    private readonly swapService: SwapService,
    @InjectModel(Wallet.name) private walletModel: Model<Wallet>
  ) {
    this.connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  }

  @Post()
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async swap(@Body() dto: SwapDto, @Request() req) {
    try {
      this.logger.debug('Swap request received:', dto);

      // 1. Récupérer le userId depuis le token JWT
      const userId = req.user.id; // Le JwtAuthGuard ajoute user au req
      this.logger.debug('User ID from JWT:', userId);

      // 2. Récupérer le wallet et décoder la clé privée
      const wallet = await this.walletModel.findOne({ 
          publicKey: dto.publicKey,
          userId: userId // Ajouter le filtre userId pour plus de sécurité
      });
      
      if (!wallet) {
          throw new BadRequestException('Wallet not found');
      }

      // 3. Décrypter la clé privée
      const privateKey = this.solanaService.decryptPrivateKey(wallet.privateKey);
      const keypair = Keypair.fromSecretKey(privateKey);

      this.logger.debug('Wallet found and keypair created');

      // 4. Récupérer le blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      this.logger.debug('Blockhash retrieved:', blockhash);

      // 5. Initialiser Orca avec le bon réseau
      const network = getNetwork(dto.network);
      const orca = getOrca(this.connection, network);

      // 6. Obtenir le pool et le token
      const poolName = getPoolName(dto.tokenFrom, dto.tokenTo);
      if (!poolName) {
          throw new BadRequestException(`Invalid token pair: ${dto.tokenFrom}-${dto.tokenTo}`);
      }

      const poolConfig: OrcaPoolConfig = getPoolAddress(poolName);
      const pool: OrcaPool = orca.getPool(poolConfig);
      const tokenFrom = getTokenFromPool(pool, dto.tokenFrom);

      // 7. Vérifier les fonds disponibles
      const tokenFromAmount = new Decimal(dto.tokenFromAmount);
      const swapFee = new Decimal(CONFIG.SWAP_FEE);

      if (!(await hasEnoughFunds(
          this.connection,
          keypair.publicKey,
          tokenFrom,
          tokenFromAmount,
          swapFee
      ))) {
          throw new BadRequestException('Insufficient funds for swap');
      }

      // 8. Exécuter le swap
      const signature = await this.swapService.swap({
          connection: this.connection,
          keypair,
          pool,
          tokenFrom,
          tokenFromAmount,
          slippage: new Decimal(dto.slippage || CONFIG.SLIPPAGE),
          swapFee,
          userId,
          blockhash
      });

      return {
          success: true,
          signature,
          message: 'Swap executed successfully'
      };

    } catch (error) {
      this.logger.error('Swap failed:', {
          error: error.message,
          stack: error.stack,
          details: error
      });
      throw new BadRequestException(error.message || 'Swap operation failed');
    }
  }

 
}