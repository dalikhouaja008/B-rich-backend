import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, BadRequestException, UseGuards, Logger, Request } from '@nestjs/common';
import { SwapService } from './swap.service';
import { CreateSwapDto } from './dto/create-swap.dto';
import { UpdateSwapDto } from './dto/update-swap.dto';
import { JwtAuthGuard } from 'src/guards/jwtAuth.guard';
import { Decimal } from 'decimal.js';
import { InjectModel } from '@nestjs/mongoose';
import { SolanaService } from 'src/solana/solana.service';
import { Model } from 'mongoose';
import { Wallet } from 'src/solana/schemas/wallet.schema';
import { SwapInterface } from './interface/swap.interface';
import { getSwapQuote } from 'src/orca/swap';
import { SwapDto } from './dto/swap.dto';
import { getPoolAddress, getPoolName, getTokenFromPool } from 'src/orca/pool';
import { Connection, Keypair, clusterApiUrl } from '@solana/web3.js';
import { Network, getOrca } from '@orca-so/sdk';
import { getNetwork } from 'src/orca/solana.utils';
import { CONFIG } from 'src/orca/config';
import { bs58 } from '@project-serum/anchor/dist/cjs/utils/bytes';
import { getSlippage, hasEnoughFunds } from 'src/orca/orca-utils';


@Controller('swap')
export class SwapController {
  private readonly DEFAULT_DEVNET_URL = 'https://api.devnet.solana.com';
  private readonly RPC_ENDPOINTS = [
    'https://solana-devnet.g.alchemy.com/v2/your-api-key', // Si vous avez une clé Alchemy
    'https://devnet.genesysgo.net/',
    'https://rpc.ankr.com/solana_devnet'
  ];
  private readonly connection: Connection;
  private readonly logger = new Logger(SwapController.name);

  constructor(
    private readonly solanaService: SolanaService,
    private readonly swapService: SwapService,
    @InjectModel(Wallet.name) private walletModel: Model<Wallet>
  ) {
    this.connection = new Connection(
      'https://api.devnet.solana.com',
      {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000
      }
    );
  }
  async createConnection(): Promise<Connection> {
    for (const endpoint of this.RPC_ENDPOINTS) {
      try {
        const connection = new Connection(endpoint, {
          commitment: 'confirmed',
          confirmTransactionInitialTimeout: 60000,
        });

        // Tester la connexion avec getSlot qui est une méthode plus stable
        await connection.getSlot();
        this.logger.debug(`Connected successfully to ${endpoint}`);
        return connection;
      } catch (error) {
        this.logger.warn(`Failed to connect to ${endpoint}: ${error.message}`);
        continue;
      }
    }
    throw new Error('Failed to connect to any Solana RPC endpoint');
  }

  @Post()
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async swap(@Body() dto: SwapDto, @Request() req) {
      try {
          this.logger.debug('Swap request received:', dto);

          // 1. Vérifier le pool
          const poolName = getPoolName(dto.tokenFrom, dto.tokenTo);
          if (!poolName) {
              throw new BadRequestException(`Invalid token pair: ${dto.tokenFrom}-${dto.tokenTo}`);
          }

          // 2. Récupérer le wallet et décoder la clé privée
          const wallet = await this.walletModel.findOne({ publicKey: dto.publicKey });
          if (!wallet) {
              throw new BadRequestException('Wallet not found');
          }

          // 3. Récupérer le blockhash
          let blockhash: string;
          try {
              const blockHashResult = await this.connection.getLatestBlockhash('confirmed');
              blockhash = blockHashResult.blockhash;
              this.logger.debug('Blockhash retrieved:', blockhash);
          } catch (error) {
              this.logger.error('Error getting blockhash:', error);
              throw new BadRequestException('Failed to get blockhash');
          }

          // 4. Initialiser Orca
          const orca = getOrca(this.connection, Network.DEVNET);
          const poolAddress = getPoolAddress(poolName);
          const pool = orca.getPool(poolAddress);
          const tokenFrom = getTokenFromPool(pool, dto.tokenFrom);

          // 5. Préparer les paramètres
          const keypair = Keypair.fromSecretKey(
              this.solanaService.decryptPrivateKey(wallet.privateKey)
          );
          const tokenFromAmount = new Decimal(dto.tokenFromAmount);
          const slippage = getSlippage(dto.slippage || 0.01);
          const swapFee = CONFIG.SWAP_FEE;

          // 6. Vérifier les fonds disponibles
          if (!(await hasEnoughFunds(
              this.connection,
              keypair.publicKey,
              tokenFrom,
              tokenFromAmount,
              swapFee
          ))) {
              throw new BadRequestException('Insufficient funds for swap');
          }

          // 7. Exécuter le swap
          const signature = await this.swapService.swap({
              connection: this.connection,
              keypair,
              pool,
              tokenFrom,
              tokenFromAmount,
              slippage,
              swapFee,
              userId: req.user.userId,
              blockhash
          });

          return {
              success: true,
              signature,
              message: 'Swap executed successfully'
          };

      } catch (error) {
          this.logger.error('Swap failed:', error);
          throw new BadRequestException(error.message || 'Swap operation failed');
      }
  }
  @Post()
  create(@Body() createSwapDto: CreateSwapDto) {
    return this.swapService.create(createSwapDto);
  }

  @Get()
  findAll() {
    return this.swapService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.swapService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSwapDto: UpdateSwapDto) {
    return this.swapService.update(+id, updateSwapDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.swapService.remove(+id);
  }
}
