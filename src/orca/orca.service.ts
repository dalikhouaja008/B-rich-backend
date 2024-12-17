import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { CreateOrcaDto } from './dto/create-orca.dto';
import { UpdateOrcaDto } from './dto/update-orca.dto';
import * as web3 from '@solana/web3.js';
import { InjectModel } from '@nestjs/mongoose';
import { Wallet } from 'src/solana/schemas/wallet.schema';
import { SolanaService } from 'src/solana/solana.service';
import Decimal from 'decimal.js';
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { readFile } from "mz/fs";
import { getOrca, OrcaFarmConfig, OrcaPoolConfig, Network } from "@orca-so/sdk";
import { Model } from 'mongoose';
import axios from 'axios'; 

@Injectable()
export class OrcaService {

  private connection: Connection;
  private orca;
  private owner: Keypair;


  // Tokens disponibles sur le devnet
  private readonly DEVNET_TOKENS = {
    USDC: new web3.PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
    USDT: new web3.PublicKey('BQcdHdAQW1hczDbBi9hcaRdBpUyVyXBWhdUdcTzhfisb'),
    SOL: web3.SystemProgram.programId
  };


  constructor(
    private readonly solanaService: SolanaService,
    @InjectModel(Wallet.name) private WalletModel: Model<Wallet>
  ) {
    // Monkey-patch the Connection class to override blockhash retrieval
    this.patchConnectionBlockhash();
    this.initializeConnection();
  }

  private async performConnectionTests() {
    try {
      // Multiple connection verification steps
      await this.connection.getVersion();
      await this.connection.getLatestBlockhash('confirmed');
      
      // Additional diagnostic information
      //const health = await this.connection.getHealth();
      //console.log('Solana connection health:', health);
    } catch (error) {
      console.error('Connection tests failed:', error);
      throw error;
    }
  }
  private patchConnectionBlockhash() {
    // Override the getLatestBlockhash method instead
    Connection.prototype.getLatestBlockhash = async function(commitment = 'confirmed') {
      try {
        // Fetch blockhash via direct HTTP request
        const response = await axios.post('https://api.devnet.solana.com', {
          jsonrpc: '2.0',
          id: 1,
          method: 'getLatestBlockhash',
          params: [{ commitment }]
        });

        if (response.data.result && response.data.result.value) {
          return {
            blockhash: response.data.result.value.blockhash,
            lastValidBlockHeight: response.data.result.value.lastValidBlockHeight
          };
        }

        throw new Error('Invalid blockhash response');
      } catch (error) {
        console.error('Blockhash retrieval error:', error);
        throw error;
      }
    };
  }
  private async validateRpcEndpoint(): Promise<boolean> {
    try {
      const response = await axios.post('https://api.devnet.solana.com', {
        jsonrpc: '2.0',
        id: 1,
        method: 'getHealth'
      });
      return response.status === 200;
    } catch (error) {
      console.error('RPC endpoint validation failed:', error);
      return false;
    }
  }
  private async initializeConnection() {
    const rpcEndpoints = [
      "https://api.devnet.solana.com",
      "https://solana-devnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY", // Optional
      "https://api.mainnet-beta.solana.com"
    ];
  
    for (const endpoint of rpcEndpoints) {
      try {
        this.connection = new Connection(endpoint, {
          commitment: 'confirmed',
          httpHeaders: {
            'User-Agent': 'YourAppName/1.0'
          }
        });
  
        // Verify connection with multiple checks
        await Promise.all([
          this.connection.getVersion(),
          this.connection.getLatestBlockhash('confirmed')
        ]);
  
        this.orca = getOrca(this.connection, Network.DEVNET);
        
        console.log(`Solana connection initialized successfully with endpoint: ${endpoint}`);
        return; // Exit after successful initialization
      } catch (error) {
        console.warn(`Connection initialization failed for ${endpoint}:`, error.message);
        continue; // Try next endpoint
      }
    }
  
    throw new Error('Failed to initialize Solana connection with any endpoint');
  }
  


  // Récupérer les informations sur un pool de swap
  async getPoolInfo(tokenA: string, tokenB: string) {
    try {
      console.log('Attempting to get pool:', tokenA, tokenB);
  
      const poolConfigs = [
        `${tokenA}/${tokenB}`,
        `${tokenA}_${tokenB}_DEVNET`,
        `${tokenB}/${tokenA}`,
        `${tokenB}_${tokenA}_DEVNET`
      ];
  
      let pool;
      for (const poolConfig of poolConfigs) {
        try {
          pool = this.orca.getPool(poolConfig as OrcaPoolConfig);
          if (pool) {
            console.log('Successfully found pool with config:', poolConfig);
            break;
          }
        } catch (configError) {
          console.log(`Failed to get pool with config: ${poolConfig}`, configError);
        }
      }
  
      if (!pool) {
        throw new BadRequestException('Pool not found');
      }
  
      // Log de l'objet pool
      console.log('Retrieved pool object:', pool);
      
      // Vérification des méthodes disponibles sur l'objet pool
      console.log('Available methods and properties on pool:', Object.keys(pool));
  
      // Utilisation des méthodes disponibles dans le SDK
      try {
        const lpTokenMint = pool.getPoolTokenMint()?.toBase58();
        const tokenAInfo = pool.getTokenA();  // Si disponible
        const tokenBInfo = pool.getTokenB();  // Si disponible
  
        return {
          lpTokenMint: lpTokenMint || 'Unknown',
          tokenASymbol: tokenAInfo?.symbol || 'Unknown',
          tokenBSymbol: tokenBInfo?.symbol || 'Unknown'
        };
      } catch (tokenError) {
        console.error('Token retrieval error:', tokenError);
        return {
          lpTokenMint: 'Unknown',
          tokenASymbol: tokenA,
          tokenBSymbol: tokenB
        };
      }
    } catch (error) {
      console.error('Detailed error in getPoolInfo:', error);
      throw new BadRequestException(`Unable to retrieve pool information: ${error.message}`);
    }
  }
  
  
  // Lister les pools de swap disponibles
  async getAvailablePools() {
    try {
      const tokens = Object.keys(this.DEVNET_TOKENS);
      const availablePools = [];

      for (let i = 0; i < tokens.length; i++) {
        for (let j = i + 1; j < tokens.length; j++) {
          const tokenA = tokens[i];
          const tokenB = tokens[j];

          const poolConfigs = [
            `${tokenA}_${tokenB}_DEVNET`,
            `${tokenB}_${tokenA}_DEVNET`
          ];

          for (const poolConfig of poolConfigs) {
            try {
              const pool = this.orca.getPool(poolConfig as OrcaPoolConfig);
              if (pool) {
                availablePools.push(poolConfig);
                break; // Stop après avoir trouvé une configuration valide
              }
            } catch (poolError) {
              // Pool non trouvée, on continue
              console.log(`Pool ${poolConfig} non trouvée`);
            }
          }
        }
      }

      return availablePools;
    } catch (error) {
     // this.logger.error('Erreur de récupération des pools', error);
      throw new BadRequestException('Impossible de récupérer la liste des pools');
    }
  }

  async getPoolDetails(poolInfo: any, tokenA: string, tokenB: string) {
    try {
      const pool = poolInfo.pool;

      // More defensive check for pool existence
      if (!pool) {
        throw new Error('Invalid pool object');
      }

      // Get token instances using getTokenA and getTokenB methods
      let tokenAInstance, tokenBInstance;

      try {
        tokenAInstance = pool.getTokenA();
        tokenBInstance = pool.getTokenB();
      } catch (tokenError) {
        console.error('Token instance retrieval error:', tokenError);
        throw new Error('Failed to get token instances');
      }

      // Ensure token instances are valid
      if (!tokenAInstance || !tokenBInstance) {
        throw new Error('Invalid token instances');
      }

      // Get pool reserves with error handling
      const reserves = await this.getPoolReserves(pool).catch(error => {
        console.error('Reserve retrieval error:', error);
        return {
          reserveA: 0,
          reserveB: 0,
          totalValueLocked: 0
        };
      });

      // Calculate token prices with error handling
      let tokenAPriceInTokenB = 0;
      let tokenBPriceInTokenA = 0;

      try {
        tokenAPriceInTokenB = await this.calculateTokenPrice(pool, tokenAInstance, tokenBInstance);
        tokenBPriceInTokenA = await this.calculateTokenPrice(pool, tokenBInstance, tokenAInstance);
      } catch (priceError) {
        console.error('Price calculation error', priceError);
      }

      return {
        poolName: poolInfo.successConfig || `${tokenA}_${tokenB}_DEVNET`,
        tokens: { tokenA, tokenB },
        lpTokenMint: poolInfo.lpTokenMint || 'Unknown',
        reserves: {
          [tokenA]: reserves.reserveA.toString(),
          [tokenB]: reserves.reserveB.toString()
        },
        prices: {
          [`${tokenA}_in_${tokenB}`]: tokenAPriceInTokenB.toFixed(6),
          [`${tokenB}_in_${tokenA}`]: tokenBPriceInTokenA.toFixed(6)
        },
        fees: {
          swapFee: '0.3%',
          liquidityProviderFee: '0.2%'
        },
        poolStats: {
          totalValueLocked: reserves.totalValueLocked.toString(),
          volume24h: 'Not available',
          apr: 'Not available'
        }
      };
    } catch (error) {
      console.error('Comprehensive pool details error:', error);
      throw new Error(`Failed to retrieve pool details: ${error.message}`);
    }
  }
  async getPoolReserves(pool: any) {
    try {
      // More defensive checks
      if (!pool) throw new Error('Invalid pool');

      const tokenAInstance = pool.getTokenA ? pool.getTokenA() : pool.tokens?.[0];
      const tokenBInstance = pool.getTokenB ? pool.getTokenB() : pool.tokens?.[1];

      if (!tokenAInstance || !tokenBInstance) {
        throw new Error('Cannot retrieve token instances');
      }

      const reserveA = await this.connection.getTokenSupply(tokenAInstance.mint);
      const reserveB = await this.connection.getTokenSupply(tokenBInstance.mint);

      const totalValueLocked = reserveA.value.amount + reserveB.value.amount;

      return {
        reserveA: reserveA.value.amount,
        reserveB: reserveB.value.amount,
        totalValueLocked
      };
    } catch (error) {
      console.error('Enhanced error getting pool reserves', error);
      return {
        reserveA: 0,
        reserveB: 0,
        totalValueLocked: 0
      };
    }
  }

  async calculateTokenPrice(pool: any, tokenIn: any, tokenOut: any) {
    try {
      const quote = await pool.getQuote(tokenIn, new Decimal(1));
      return quote.getMinOutputAmount().toNumber();
    } catch (error) {
      console.error('Error calculating token price', error);
      return 0;
    }
  }
  // Exécuter un swap entre deux tokens
  /*async executeSwap(
    userId: string,
    fromWalletPublicKey: string,
    inputTokenName: string,
    outputTokenName: string,
    amount: number
  ) {
    try {
      // Récupérer le wallet source
      const fromWallet = await this.WalletModel.findOne({
        userId,
        publicKey: fromWalletPublicKey
      });

      if (!fromWallet) {
        throw new BadRequestException('Wallet source non trouvé');
      }

      // Convertir les noms de tokens en clés publiques
      const inputTokenKey = this.DEVNET_TOKENS[inputTokenName];
      const outputTokenKey = this.DEVNET_TOKENS[outputTokenName];

      if (!inputTokenKey || !outputTokenKey) {
        throw new BadRequestException('Token non supporté');
      }

      // Sélectionner le pool de swap
      const pool = this.orca.getPool(`${inputTokenName}_${outputTokenName}_DEVNET` as OrcaPoolConfig);

      // Préparer les paramètres de swap
      const solAmount = new Decimal(amount);
      const inputToken = pool.getTokenA(); // Ajustez selon votre besoin
      const quote = await pool.getQuote(inputToken, solAmount);
      const minOutputAmount = quote.getMinOutputAmount();

      const owner = web3.Keypair.fromSecretKey(
        this.solanaService['decryptPrivateKey'](fromWallet.privateKey)
      );

      const swapPayload = await pool.swap(
        owner,
        inputToken,
        solAmount,
        minOutputAmount
      );

      const signature = await swapPayload.execute();

      // Synchroniser les soldes
      await this.solanaService.syncWalletBalanceInDatabase(fromWalletPublicKey);

      return {
        signature,
        message: 'Swap exécuté avec succès'
      };
    } catch (error) {
      this.logger.error('Erreur lors du swap Orca', error);
      throw new BadRequestException(`Échec du swap : ${error.message}`);
    }
  }*/

  create(createOrcaDto: CreateOrcaDto) {
    return 'This action adds a new orca';
  }

  findAll() {
    return `This action returns all orca`;
  }

  findOne(id: number) {
    return `This action returns a #${id} orca`;
  }

  update(id: number, updateOrcaDto: UpdateOrcaDto) {
    return `This action updates a #${id} orca`;
  }

  remove(id: number) {
    return `This action removes a #${id} orca`;
  }

  public async swapSolForOrca(amount: number, walletPublicKey: string) {
    try {
        const wallet = await this.WalletModel.findOne({ publicKey: walletPublicKey });
        if (!wallet) throw new BadRequestException('Wallet not found');

        const privateKey = this.solanaService.decryptPrivateKey(wallet.privateKey);
        const owner = Keypair.fromSecretKey(privateKey);
        
        const orcaSolPool = this.orca.getPool(OrcaPoolConfig.ORCA_SOL);
        const solToken = orcaSolPool.getTokenB();
        const solAmount = new Decimal(amount);

        const quote = await orcaSolPool.getQuote(solToken, solAmount);
        const orcaAmount = quote.getMinOutputAmount();

        const swapPayload = await orcaSolPool.swap(owner, solToken, solAmount, orcaAmount);
        return await swapPayload.execute();
    } catch (error) {
        console.error('Swap error:', error);
        throw new BadRequestException(`Swap failed: ${error.message}`);
    }
}

  
  // Méthode de récupération de blockhash
  private async getRecentBlockhash(): Promise<string> {
    const endpoints = [
        'https://api.devnet.solana.com',
        'https://api.mainnet-beta.solana.com',
        'https://solana-devnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY'
    ];

    for (const endpoint of endpoints) {
        try {
            const response = await axios.post(endpoint, {
                jsonrpc: '2.0',
                id: 1,
                method: 'getLatestBlockhash',
                params: [{ commitment: 'confirmed' }]
            });

            if (response.data.result && response.data.result.value) {
                return response.data.result.value.blockhash;
            }
        } catch (error) {
            console.warn(`Failed to retrieve blockhash from ${endpoint}:`, error.message);
        }
    }
    
    throw new Error('Unable to retrieve blockhash from all endpoints');
}


  
  public async depositToPool(amount: number, walletPublicKey: string) {
    try {
      // Explicitly get blockhash before transaction
      const blockhash = await this.getRecentBlockhash();
  
      // Rest of your existing method
      const wallet = await this.WalletModel.findOne({ publicKey: walletPublicKey });
      if (!wallet) {
        throw new BadRequestException('Wallet not found');
      }
  
      // Decrypt private key
      const privateKey = this.solanaService.decryptPrivateKey(wallet.privateKey);
      const owner = Keypair.fromSecretKey(privateKey);
  
      const orcaSolPool = this.orca.getPool(OrcaPoolConfig.ORCA_SOL);
      const solAmount = amount;
      const orcaAmount = await this.swapSolForOrca(solAmount, walletPublicKey);
  
      const { maxTokenAIn, maxTokenBIn, minPoolTokenAmountOut } = await orcaSolPool.getDepositQuote(
        orcaAmount,
        solAmount
      );
  
      // Create transaction with explicitly retrieved blockhash
      const poolDepositPayload = await orcaSolPool.deposit(
        owner,
        maxTokenAIn,
        maxTokenBIn,
        minPoolTokenAmountOut,
        { blockhash } // Pass blockhash explicitly
      );
  
      const poolDepositTxId = await poolDepositPayload.execute();
  
      console.log("Pool deposited:", poolDepositTxId);
      return poolDepositTxId;
    } catch (error) {
      console.error("Comprehensive error during pool deposit:", {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        errorCode: error.code
      });
      throw error;
    }
  }

  public async depositToFarm(walletPublicKey: string) {
    try {
      // Retrieve wallet from database
      const wallet = await this.WalletModel.findOne({ publicKey: walletPublicKey });
      if (!wallet) {
        throw new BadRequestException('Wallet not found');
      }

      // Decrypt private key
      const privateKey = this.solanaService.decryptPrivateKey(wallet.privateKey);
      const owner = Keypair.fromSecretKey(privateKey);

      const orcaSolPool = this.orca.getPool(OrcaPoolConfig.ORCA_SOL);
      const lpBalance = await orcaSolPool.getLPBalance(owner.publicKey);
      const orcaSolFarm = this.orca.getFarm(OrcaFarmConfig.ORCA_SOL_AQ);

      const farmDepositPayload = await orcaSolFarm.deposit(owner, lpBalance);
      const farmDepositTxId = await farmDepositPayload.execute();

      console.log("Farm deposited:", farmDepositTxId);
      return farmDepositTxId;
    } catch (error) {
      console.error("Error during farm deposit:", error);
      throw error;
    }
  }

  public async withdrawFromFarm(walletPublicKey: string) {
    try {
      // Retrieve wallet from database
      const wallet = await this.WalletModel.findOne({ publicKey: walletPublicKey });
      if (!wallet) {
        throw new BadRequestException('Wallet not found');
      }

      // Decrypt private key
      const privateKey = this.solanaService.decryptPrivateKey(wallet.privateKey);
      const owner = Keypair.fromSecretKey(privateKey);

      const orcaSolFarm = this.orca.getFarm(OrcaFarmConfig.ORCA_SOL_AQ);
      const farmBalance = await orcaSolFarm.getFarmBalance(owner.publicKey);

      const farmWithdrawPayload = await orcaSolFarm.withdraw(owner, farmBalance);
      const farmWithdrawTxId = await farmWithdrawPayload.execute();

      console.log("Farm withdrawn:", farmWithdrawTxId);
      return farmWithdrawTxId;
    } catch (error) {
      console.error("Error during farm withdrawal:", error);
      throw error;
    }
  }

  public async withdrawFromPool(walletPublicKey: string) {
    try {
      // Retrieve wallet from database
      const wallet = await this.WalletModel.findOne({ publicKey: walletPublicKey });
      if (!wallet) {
        throw new BadRequestException('Wallet not found');
      }

      // Decrypt private key
      const privateKey = this.solanaService.decryptPrivateKey(wallet.privateKey);
      const owner = Keypair.fromSecretKey(privateKey);

      const orcaSolPool = this.orca.getPool(OrcaPoolConfig.ORCA_SOL);
      const withdrawTokenAmount = await orcaSolPool.getLPBalance(owner.publicKey);
      const withdrawTokenMint = orcaSolPool.getPoolTokenMint();

      const { maxPoolTokenAmountIn, minTokenAOut, minTokenBOut } = await orcaSolPool.getWithdrawQuote(
        withdrawTokenAmount,
        withdrawTokenMint
      );

      console.log(
        `Withdraw at most ${maxPoolTokenAmountIn.toNumber()} ORCA_SOL LP token for at least ${minTokenAOut.toNumber()} ORCA and ${minTokenBOut.toNumber()} SOL`
      );

      const poolWithdrawPayload = await orcaSolPool.withdraw(
        owner,
        maxPoolTokenAmountIn,
        minTokenAOut,
        minTokenBOut
      );
      const poolWithdrawTxId = await poolWithdrawPayload.execute();

      console.log("Pool withdrawn:", poolWithdrawTxId);
      return poolWithdrawTxId;
    } catch (error) {
      console.error("Error during pool withdrawal:", error);
      throw error;
    }
  }
}
       // Try alternative pool configuration methods
/*const poolConfigs = [
 `${tokenA}_${tokenB}_DEVNET` as OrcaPoolConfig,
 `${tokenB}_${tokenA}_DEVNET`as OrcaPoolConfig,
 `${tokenA}/${tokenB}` as OrcaPoolConfig,
 `${tokenB}/${tokenA}` as OrcaPoolConfig
];
 
let pool;
for (const poolConfig of poolConfigs) {
 try {
   pool = this.orca.getPool(poolConfig);
   if (pool) {
     console.log('Successfully found pool with config:', poolConfig);
     break;
   }
 } catch (configError) {
   console.log(`Failed to get pool with config: ${poolConfig}`, configError);
 }
}
if (!pool) {
 console.error('No pool found for config:', poolConfigs);
 throw new BadRequestException('Pool not found');
}
console.log('Pool found:', pool);
// Récupérer les informations du pool
const tokenAObj = pool.getTokenA();
const tokenBObj = pool.getTokenB();*/