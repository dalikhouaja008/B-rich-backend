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
import { TransactionRecord } from 'src/solana/schemas/transaction.schema';

@Injectable()
export class SwapService {
  private readonly logger = new Logger(SwapService.name);
  private readonly connection: Connection;
  private readonly JUPITER_API_URL = 'https://quote-api.jup.ag/v6';
  private readonly JUPITER_TOKENS_URL = 'https://token.jup.ag/all';
  private cachedTokens: { [key: string]: TokenInfo } = {};
  private tokenCache: any[] = [];
  private lastCacheUpdate: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes en millisecondes

  constructor(
      @InjectModel(Wallet.name) private walletModel: Model<Wallet>,
      @InjectModel(TransactionRecord.name) private transactionModel: Model<TransactionRecord>
  ) {
      this.connection = new Connection('https://api.devnet.solana.com', 'confirmed');
      this.initializeTokensCache();
  }

  private async initializeTokensCache() {
      await this.updateTokensCache();
  }

  private async updateTokensCache() {
      try {
          const currentTime = Date.now();
          if (currentTime - this.lastCacheUpdate < this.CACHE_DURATION) {
              return; // Utiliser le cache si moins de 5 minutes se sont écoulées
          }

          this.logger.debug('Updating tokens cache from Jupiter...');
          
          // Récupérer tous les tokens depuis Jupiter
          const { data } = await axios.get(this.JUPITER_TOKENS_URL);
          
          // Mettre à jour le cache
          this.cachedTokens = data.reduce((acc: { [key: string]: TokenInfo }, token: TokenInfo) => {
              acc[token.address] = token;
              return acc;
          }, {});

          this.lastCacheUpdate = currentTime;
          this.logger.debug(`Successfully cached ${Object.keys(this.cachedTokens).length} tokens`);
      } catch (error) {
          this.logger.error('Failed to update tokens cache:', error);
          throw new BadRequestException('Failed to fetch available tokens');
      }
  }

  async getAllTokens(limit: number = 15) {
    try {
        if (this.tokenCache.length === 0) {
            // Faire l'appel API pour obtenir tous les tokens
            const response = await axios.get('https://token.jup.ag/strict');
            this.tokenCache = response.data;
            this.logger.debug(`Successfully cached ${this.tokenCache.length} tokens`);
        }

        // Prendre seulement les 15 premiers tokens et extraire les informations essentielles
        const limitedTokens = this.tokenCache
            .slice(0, limit)
            .map(token => ({
                mint: token.address,
                symbol: token.symbol,
                name: token.name
            }));

        return limitedTokens;
    } catch (error) {
        this.logger.error('Failed to fetch tokens:', error);
        throw new BadRequestException('Failed to fetch tokens');
    }
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
      inputMint: string;
      outputMint: string;
      amount: number;
      slippage: number;
  }) {
      try {
          // Vérifier si les tokens sont supportés
          const inputToken = await this.getTokenByMint(params.inputMint);
          const outputToken = await this.getTokenByMint(params.outputMint);

          if (!inputToken) {
              throw new BadRequestException(`Input token ${params.inputMint} is not supported`);
          }
          if (!outputToken) {
              throw new BadRequestException(`Output token ${params.outputMint} is not supported`);
          }

          const amountInLamports = Math.floor(params.amount * LAMPORTS_PER_SOL).toString();
          const slippageBps = Math.floor(params.slippage * 10000);

          this.logger.debug('Requesting swap quote with params:', {
              inputMint: params.inputMint,
              outputMint: params.outputMint,
              amount: amountInLamports,
              slippageBps
          });

          const response = await axios.get(`${this.JUPITER_API_URL}/quote`, {
              params: {
                  inputMint: params.inputMint,
                  outputMint: params.outputMint,
                  amount: amountInLamports,
                  slippageBps: slippageBps,
                  feeBps: 4,
                  onlyDirectRoutes: false,
                  asLegacyTransaction: true
              }
          });

          return response.data;
      } catch (error) {
          if (axios.isAxiosError(error) && error.response?.data?.error) {
              this.logger.error('Jupiter API Error:', error.response.data);
              throw new BadRequestException(error.response.data.error);
          }
          this.logger.error('Error getting swap quote:', error);
          throw new BadRequestException('Failed to get swap quote');
      }
  }
  async swap(params: {
    userPublicKey: string;
    inputMint: string;
    outputMint: string;
    amount: number;
    slippage: number;
}) {
    try {
        // 1. Get quote
        const quote = await this.getSwapQuote({
            inputMint: params.inputMint,
            outputMint: params.outputMint,
            amount: params.amount,
            slippage: params.slippage
        });

        this.logger.debug('Got swap quote:', quote);

        // 2. Get swap transaction
        const swapRequestBody = {
            quoteResponse: quote,
            userPublicKey: params.userPublicKey,
            wrapUnwrapSOL: true,
            // Forcer l'utilisation des transactions legacy
            asLegacyTransaction: true,
            // Désactiver l'utilisation des address lookup tables
            useSharedAccounts: false,
            // Paramètres supplémentaires pour le devnet
            computeUnitPriceMicroLamports: 1000,
            destinationWallet: params.userPublicKey
        };

        this.logger.debug('Requesting swap transaction:', swapRequestBody);

        const { data: swapTransaction } = await axios.post(
            `${this.JUPITER_API_URL}/swap`,
            swapRequestBody
        );

        // 3. Deserialize et prépare la transaction
        let transaction: Transaction;
        
        if (typeof swapTransaction.swapTransaction === 'string') {
            // Si c'est une transaction encodée en base64
            const serializedTransaction = Buffer.from(swapTransaction.swapTransaction, 'base64');
            transaction = Transaction.from(serializedTransaction);
        } else {
            throw new BadRequestException('Invalid transaction format received');
        }

        // 4. Get recent blockhash
        const { blockhash, lastValidBlockHeight } = 
            await this.connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.lastValidBlockHeight = lastValidBlockHeight;

        // 5. Préparer la réponse
        return {
            transaction: transaction.serialize({
                requireAllSignatures: false,
                verifySignatures: false
            }).toString('base64'),
            message: 'Transaction prepared successfully',
            quote: quote
        };

    } catch (error) {
        this.logger.error('Swap failed:', error);
        if (axios.isAxiosError(error) && error.response?.data) {
            this.logger.error('Jupiter API Error:', error.response.data);
            throw new BadRequestException(error.response.data.error || 'Swap failed');
        }
        throw new BadRequestException(error.message || 'Swap failed');
    }
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
}