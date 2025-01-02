import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { CreateSwapDto } from './dto/create-swap.dto';
import { UpdateSwapDto } from './dto/update-swap.dto';
import { SwapInterface } from './interface/swap.interface';
import { Connection, Keypair, PublicKey, Transaction, TransactionSignature } from '@solana/web3.js';
import { SolanaModule } from 'src/solana/solana.module';
import { InjectModel } from '@nestjs/mongoose';
import { Wallet } from 'src/solana/schemas/wallet.schema';
import { Model } from 'mongoose';
import { OrcaPool, OrcaPoolToken, Quote } from '@orca-so/sdk';
import { Decimal } from 'decimal.js'; 
import { TransactionRecord } from 'src/solana/schemas/transaction.schema';
import { getSwapQuote, swap } from 'src/orca/swap';


@Injectable()
export class SwapService {

  private readonly logger = new Logger(SwapService.name);

  constructor(
    @InjectModel(Wallet.name) private walletModel: Model<Wallet>,
    @InjectModel(TransactionRecord.name) private transactionModel: Model<TransactionRecord>
  ) {}

  async saveSwapTransaction(
    swapDetails: SwapInterface,
    signature: string,
    quote: Quote
  ) {
    try {
      // Implémentez ici la logique de sauvegarde de la transaction
      this.logger.log(`Swap transaction saved: ${signature}`);
    } catch (error) {
      this.logger.error('Error saving swap transaction:', error);
    }
  }
 
  

  async swap(params: {
    connection: Connection;
    keypair: Keypair;
    pool: OrcaPool;
    tokenFrom: OrcaPoolToken;
    tokenFromAmount: Decimal;
    slippage: Decimal;
    swapFee: Decimal;
    userId: string;
    blockhash: string;
}): Promise<string> {
    try {
        // 1. Obtenir le quote
        this.logger.debug('Getting quote...');
        const quote = await params.pool.getQuote(
            params.tokenFrom,
            params.tokenFromAmount,
            params.slippage
        );

        if (!quote) {
            throw new Error('Failed to get quote from pool');
        }

        // 2. Créer le swap quote
        const swapQuote = await getSwapQuote(
            params.pool,
            params.tokenFrom,
            params.tokenFromAmount,
            params.slippage
        );

        // 3. Créer le swap payload
        const swapTxPayload = await swap(
            params.pool,
            params.keypair,
            swapQuote
        );

        // 4. Obtenir la transaction
        const transaction = await swapTxPayload.transaction;
        
        // 5. Configurer la transaction avec notre blockhash
        transaction.recentBlockhash = params.blockhash;
        transaction.feePayer = params.keypair.publicKey;

        // 6. Signer et exécuter
        const signature = await swapTxPayload.execute();

        // 7. Enregistrer la transaction
        await this.transactionModel.create({
            signature,
            walletPublicKey: params.keypair.publicKey.toString(),
            userId: params.userId,
            fromAddress: params.keypair.publicKey.toString(),
            toAddress: quote.getExpectedOutputAmount().toString(),
            amount: params.tokenFromAmount.toNumber(),
            blockTime: Math.floor(Date.now() / 1000),
            status: 'confirmed',
            type: 'swap',
            timestamp: new Date(),
            fee: params.swapFee.toNumber()
        });

        return signature;

    } catch (error) {
        this.logger.error('Swap failed:', error);
        throw new BadRequestException(error.message || 'Swap operation failed');
    }
}
  private async updateWalletBalances(
    publicKey: string,
    fromToken: string,
    toToken: string,
    fromAmount: number,
    toAmount: number
  ) {
    try {
      // Mettre à jour le wallet source
      await this.walletModel.findOneAndUpdate(
        { publicKey, currency: fromToken },
        { $inc: { balance: -fromAmount } }
      );

      // Mettre à jour le wallet destination
      const toWallet = await this.walletModel.findOne({
        publicKey,
        currency: toToken
      });

      if (toWallet) {
        toWallet.balance += toAmount;
        await toWallet.save();
      } else {
        // Créer un nouveau wallet pour le token reçu si nécessaire
        await this.walletModel.create({
          publicKey,
          currency: toToken,
          balance: toAmount,
          type: 'GENERATED',
          network: 'devnet'
        });
      }
    } catch (error) {
      this.logger.error('Failed to update wallet balances:', error);
      throw new InternalServerErrorException('Failed to update wallet balances');
    }
  }

  public async hasEnoughFunds(
    connection: Connection,
    publicKey: PublicKey,
    token: OrcaPoolToken,
    amount: Decimal,
    fee: Decimal
  ): Promise<boolean> {
    try {
      const balance = await connection.getBalance(publicKey);
      const requiredAmount = amount.plus(fee);
      
      // Utiliser la propriété scale directement
      const tokenDecimals = token.scale;
      return balance >= requiredAmount.toNumber() * Math.pow(10, tokenDecimals);
    } catch (error) {
      this.logger.error('Error checking funds:', error);
      return false;
    }
  }


    // Fonction pour obtenir le quote du swap
    public async getSwapQuote(
      pool: OrcaPool,
      tokenFrom: OrcaPoolToken,
      amount: Decimal,
      slippage: Decimal
    ): Promise<Quote> {  // Ajout du type de retour explicite
      try {
        return await pool.getQuote(tokenFrom, amount, slippage);
      } catch (error) {
        this.logger.error('Error getting swap quote:', error);
        throw new BadRequestException('Failed to get swap quote');
      }
    }
    // Fonction utilitaire pour convertir depuis les unités de token
    private fromTokenUnits(amount: Decimal, token: OrcaPoolToken): Decimal {
      return amount.div(new Decimal(10).pow(token.scale));
    }


  create(createSwapDto: CreateSwapDto) {
    return 'This action adds a new swap';
  }

  findAll() {
    return `This action returns all swap`;
  }

  findOne(id: number) {
    return `This action returns a #${id} swap`;
  }

  update(id: number, updateSwapDto: UpdateSwapDto) {
    return `This action updates a #${id} swap`;
  }

  remove(id: number) {
    return `This action removes a #${id} swap`;
  }
}
