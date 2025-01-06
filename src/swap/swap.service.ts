// swap.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Connection,
  Keypair,
  PublicKey,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
  Transaction
} from '@solana/web3.js';
import { Decimal } from 'decimal.js';
import axios from 'axios';
import { Wallet } from 'src/solana/schemas/wallet.schema';
import { TransactionDocument  } from 'src/solana/schemas/transaction.schema';
import { SwapResult } from './interface/swapResult.interface';
import { TokenBalance } from './interface/tokenBalance.interface';
import { SolanaService } from 'src/solana/solana.service';
import { SwapDto } from './dto/swap.dto';

@Injectable()
export class SwapService {
  private readonly logger = new Logger(SwapService.name);
  private readonly connection: Connection;
  private readonly JUPITER_API_URL = 'https://quote-api.jup.ag/v6';
  private readonly JUPITER_TOKENS_URL = 'https://token.jup.ag/strict';  
  private cachedTokens: { [key: string]: TokenInfo } = {};
  private tokenCache: Map<string, TokenInfo> = new Map();
  private lastCacheUpdate: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes en millisecondes

  constructor(
    private readonly solanaService: SolanaService,
      @InjectModel(Wallet.name) private walletModel: Model<Wallet>,
      @InjectModel(TransactionDocument .name) private transactionModel: Model<TransactionDocument >
  ) {
      this.connection = new Connection('https://api.devnet.solana.com', 'confirmed');
      this.initializeTokensCache();
  }

  private async initializeTokensCache() {
      await this.updateTokensCache();
  }

  private async updateTokensCache(): Promise<void> {
    try {
        const currentTime = Date.now();
        if (currentTime - this.lastCacheUpdate < this.CACHE_DURATION && this.tokenCache.size > 0) {
            return; // Utiliser le cache existant
        }

        this.logger.debug('Updating tokens cache...');
        
        const response = await axios.get(this.JUPITER_TOKENS_URL);
        const tokens = response.data;

        // Vider et mettre à jour le cache
        this.tokenCache.clear();
        tokens.forEach(token => {
            this.tokenCache.set(token.symbol, {
                address: token.address,
                symbol: token.symbol,
                decimals: token.decimals,
                name: token.name
            });
        });

        this.lastCacheUpdate = currentTime;
        this.logger.debug(`Cache updated with ${this.tokenCache.size} tokens`);

    } catch (error) {
        this.logger.error('Failed to update tokens cache:', error);
        throw new BadRequestException('Failed to fetch token list');
    }
}

private async getTokenMintBySymbol(symbol: string): Promise<string> {
  await this.updateTokensCache();
  
  const token = this.tokenCache.get(symbol.toUpperCase());
  if (!token) {
      throw new BadRequestException(`Token ${symbol} not supported`);
  }
  
  return token.address;
}

  private async updateWalletTradedTokens(walletId: string, swapResult: SwapResult) {
    try {
      const wallet = await this.walletModel.findById(walletId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Mise à jour des traded tokens...
      const tokenIndex = wallet.tradedTokens.findIndex(
        token => token.mint === swapResult.outputMint
      );

      if (tokenIndex > -1) {
        wallet.tradedTokens[tokenIndex].balance += swapResult.outputAmount;
        wallet.tradedTokens[tokenIndex].swappedAmount += swapResult.outputAmount;
        wallet.tradedTokens[tokenIndex].lastSwapDate = new Date();
      } else {
        wallet.tradedTokens.push({
          symbol: swapResult.outputMint, // Vous pourriez vouloir obtenir le vrai symbole
          balance: swapResult.outputAmount,
          mint: swapResult.outputMint,
          tokenAccount: null,
          swappedAmount: swapResult.outputAmount,
          lastSwapDate: new Date()
        });
      }

      await wallet.save();
    } catch (error) {
      this.logger.error('Failed to update traded tokens:', error);
      throw error;
    }
  }
  async getAvailableTokens() {
    await this.updateTokensCache();
    return Array.from(this.tokenCache.values())
        .slice(0, 10)  // Limite aux 10 premiers tokens
        .map(token => ({
            symbol: token.symbol,
            name: token.name,
            mint: token.address,
            decimals: token.decimals
        }));
}

  async getTokenByMint(mint: string): Promise<TokenInfo | null> {
      await this.updateTokensCache();
      return this.cachedTokens[mint] || null;
  }

  async isTokenSupported(mint: string): Promise<boolean> {
      const token = await this.getTokenByMint(mint);
      return token !== null;
  }

  async getAvailablePairs() {
      try {
          // Récupérer les routes disponibles depuis Jupiter
          const response = await axios.get(`${this.JUPITER_API_URL}/indexed-route-map`);
          return response.data;
      } catch (error) {
          this.logger.error('Failed to fetch available pairs:', error);
          throw new BadRequestException('Failed to fetch available trading pairs');
      }
  }

  async getSwapQuote(params: {
    fromSymbol: string;
    toSymbol: string;
    amount: number;
    slippage: number;
}) {
    try {
        // Validation des paramètres
        if (!params.fromSymbol || !params.toSymbol) {
            throw new BadRequestException('Invalid token symbols');
        }

        if (params.amount <= 0) {
            throw new BadRequestException('Amount must be greater than 0');
        }

        // Obtenir les mint addresses
        const inputMint = await this.getTokenMintBySymbol(params.fromSymbol);
        const outputMint = await this.getTokenMintBySymbol(params.toSymbol);

        // Obtenir les informations des tokens
        const inputToken = this.tokenCache.get(params.fromSymbol.toUpperCase());
        const outputToken = this.tokenCache.get(params.toSymbol.toUpperCase());

        // Calculer le montant en unités minimales
        const amountInSmallestUnit = Math.floor(
            params.amount * Math.pow(10, inputToken.decimals)
        ).toString();

        const slippageBps = Math.floor(params.slippage * 10000);

        this.logger.debug('Requesting quote with params:', {
            inputMint,
            outputMint,
            amount: amountInSmallestUnit,
            slippageBps
        });

        // Appel à l'API Jupiter avec retry
        let retries = 3;
        while (retries > 0) {
            try {
                const response = await axios.get(`${this.JUPITER_API_URL}/quote`, {
                    params: {
                        inputMint,
                        outputMint,
                        amount: amountInSmallestUnit,
                        slippageBps,
                        feeBps: 4,
                        onlyDirectRoutes: true,
                        asLegacyTransaction: true
                    },
                    timeout: 10000
                });

                // Convertir les montants en retour
                const quote = response.data;
                return {
                    inputAmount: parseFloat(quote.inputAmount) / Math.pow(10, inputToken.decimals),
                    outputAmount: parseFloat(quote.outputAmount) / Math.pow(10, outputToken.decimals),
                    fromSymbol: params.fromSymbol,
                    toSymbol: params.toSymbol,
                    price: quote.price,
                    priceImpact: quote.priceImpact
                };

            } catch (error) {
                retries--;
                if (retries === 0) {
                    if (axios.isAxiosError(error) && error.response?.data?.error) {
                        throw new BadRequestException(error.response.data.error);
                    }
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    } catch (error) {
        this.logger.error('Failed to get quote:', error);
        if (error instanceof BadRequestException) {
            throw error;
        }
        throw new BadRequestException(
            'Failed to get quote: ' + (error.message || 'Unknown error')
        );
    }
}
  async swap(swapDto: SwapDto) {
 
    try {
      const inputMint = await this.getTokenMintBySymbol(swapDto.fromSymbol);
      const outputMint = await this.getTokenMintBySymbol(swapDto.toSymbol);

      const wallet = await this.walletModel.findOne({ 
        publicKey: swapDto.userPublicKey 
      });
      
      if (!wallet || !wallet.privateKey) {
        throw new BadRequestException('Wallet not found or private key missing');
      }

      // 1. Convertir le montant en lamports
      const amountInLamports = (swapDto.amount * LAMPORTS_PER_SOL).toString();

      // 2. Obtenir le quote
      const quoteResponse = await this.getQuote({
        inputMint,
        outputMint,
        amount: amountInLamports,
        slippageBps: Math.round(swapDto.slippage * 10000)
      });

      // 3. Obtenir la transaction
      const swapTransaction = await this.getSwapTransaction({
        quoteResponse,
        userPublicKey: swapDto.userPublicKey
      });

      // 4. Décrypter la clé privée
      const privateKeyBytes = await this.solanaService.decryptPrivateKey(wallet.privateKey);
      const keypair = Keypair.fromSecretKey(new Uint8Array(privateKeyBytes));

      // 5. Obtenir le dernier blockhash avec une plus longue validité
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('finalized');

      // 6. Créer et signer la transaction
      const transaction = Transaction.from(Buffer.from(swapTransaction, 'base64'));
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = keypair.publicKey;
      transaction.sign(keypair);

      // 7. Envoyer la transaction avec retry
      let signature: string;
      let retries = 3;
      
      while (retries > 0) {
        try {
          signature = await this.connection.sendRawTransaction(
            transaction.serialize(),
            {
              skipPreflight: true,
              maxRetries: 3,
              preflightCommitment: 'processed'
            }
          );
          break;
        } catch (error) {
          retries--;
          if (retries === 0) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // 8. Attendre la confirmation avec un timeout plus long et polling
      const startTime = Date.now();
      const maxTimeout = 120000; // 2 minutes
      
      while (Date.now() - startTime < maxTimeout) {
        try {
          const status = await this.connection.getSignatureStatus(signature);
          
          if (status.value !== null) {
            if (status.value.err) {
              throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
            }
            
            if (status.value.confirmationStatus === 'confirmed' || 
                status.value.confirmationStatus === 'finalized') {
              // Transaction confirmée avec succès
              return {
                success: true,
                signature,
                message: 'Swap completed successfully',
                status: status.value.confirmationStatus
              };
            }
          }
          
          // Attendre avant la prochaine vérification
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          this.logger.warn('Error checking transaction status:', error);
          // Continuer à vérifier même en cas d'erreur
        }
      }

      // Si on arrive ici, la transaction n'a pas été confirmée dans le temps imparti
      return {
        success: true,
        signature,
        message: 'Swap initiated successfully, but confirmation is taking longer than expected. ' +
                 'Please check the transaction status using the signature.',
        status: 'pending'
      };

    } catch (error) {
      this.logger.error('Swap execution failed:', error);
      throw new BadRequestException(error.message || 'Swap failed');
    }
  }

  private async getQuote(params: {
    inputMint: string;
    outputMint: string;
    amount: string;
    slippageBps: number;
  }) {
    try {
      const { data } = await axios.get(`${this.JUPITER_API_URL}/quote`, {
        params: {
          inputMint: params.inputMint,
          outputMint: params.outputMint,
          amount: params.amount,
          slippageBps: params.slippageBps,
          onlyDirectRoutes: true,
          asLegacyTransaction: true
        }
      });
      return data;
    } catch (error) {
      this.logger.error('Failed to get quote:', error);
      throw new BadRequestException('Failed to get quote from Jupiter');
    }
  }

  private async getSwapTransaction(params: {
    quoteResponse: any;
    userPublicKey: string;
  }) {
    try {
      const { data } = await axios.post(`${this.JUPITER_API_URL}/swap`, {
        quoteResponse: params.quoteResponse,
        userPublicKey: params.userPublicKey,
        wrapUnwrapSOL: true,
        asLegacyTransaction: true,
        useSharedAccounts: false
      });
      return data.swapTransaction;
    } catch (error) {
      this.logger.error('Failed to get swap transaction:', error);
      throw new BadRequestException('Failed to get swap transaction from Jupiter');
    }
  }

  private async waitForTransactionConfirmation(signature: string): Promise<any> {
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const status = await this.connection.getSignatureStatus(signature);
        
        if (status.value?.confirmationStatus === 'confirmed' || 
            status.value?.confirmationStatus === 'finalized') {
          return status;
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
      } catch (error) {
        this.logger.warn(`Error checking transaction status (attempt ${attempts + 1}):`, error);
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
      }
    }

    throw new Error('Transaction confirmation timeout');
  }
  // Méthode pour récupérer la liste des tokens disponibles
  async getTokensList() {
    try {
      const { data } = await axios.get('https://token.jup.ag/strict');
      return data;
    } catch (error) {
      this.logger.error('Failed to fetch token list:', error);
      throw new BadRequestException('Failed to fetch token list');
    }
  }


  async checkTransactionStatus(signature: string) {
    try {
      const connection = new Connection(
        'https://api.devnet.solana.com',
        'confirmed'
      );

      // Essayer de récupérer directement depuis la blockchain
      const status = await connection.getSignatureStatuses([signature], {
        searchTransactionHistory: true
      });

      if (!status || !status.value[0]) {
        return {
          success: false,
          signature,
          message: 'Transaction not found or expired',
          status: 'expired',
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: true,
        signature,
        status: status.value[0].confirmationStatus,
        error: status.value[0].err,
        slot: status.value[0].slot,
        confirmations: status.value[0].confirmations,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Error checking transaction: ${error.message}`);
      throw new BadRequestException('Failed to check transaction status');
    }
  }

 /* async retrySwap(params: {
    userPublicKey: string;
    inputMint: string;
    outputMint: string;
    amount: number;
    slippage: number;
  }) {
    try {
      // Utiliser une nouvelle transaction avec les mêmes paramètres
      return this.swap(params);
    } catch (error) {
      this.logger.error('Retry swap failed:', error);
      throw new BadRequestException('Failed to retry swap');
    }
  }*/
}