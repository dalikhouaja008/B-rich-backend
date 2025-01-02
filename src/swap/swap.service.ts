import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Connection, Keypair, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import { getOrca, Network, OrcaPoolConfig, OrcaPool, OrcaToken, Quote } from '@orca-so/sdk';
import Decimal from 'decimal.js';
import { Wallet } from 'src/solana/schemas/wallet.schema';
import { TransactionRecord } from 'src/solana/schemas/transaction.schema';

@Injectable()
export class SwapService {
    private readonly logger = new Logger(SwapService.name);
    private readonly connection: Connection;

    constructor(
        @InjectModel(Wallet.name) private walletModel: Model<Wallet>,
        @InjectModel(TransactionRecord.name) private transactionModel: Model<TransactionRecord>
    ) {
        this.connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    }

    async getSwapQuote(
        pool: OrcaPool,
        tokenFrom: OrcaToken,
        amount: Decimal,
        slippage: Decimal
    ): Promise<Quote> {
        try {
            this.logger.debug('Getting swap quote with params:', {
                tokenFromMint: tokenFrom.mint.toString(),
                amount: amount.toString(),
                slippage: slippage.toString()
            });

            const quote = await pool.getQuote(tokenFrom, amount, slippage);

            this.logger.debug('Quote received successfully:', {
                expectedOutputAmount: quote.getExpectedOutputAmount().toString(),
                minOutputAmount: quote.getMinOutputAmount().toString()
            });

            return quote;
        } catch (error) {
            this.logger.error('Error getting swap quote:', {
                error: error.message,
                stack: error.stack
            });
            throw new BadRequestException({
                message: 'Failed to get swap quote',
                details: error.message
            });
        }
    }

    async swap(params: {
        connection: Connection,
        keypair: Keypair,
        pool: OrcaPool,
        tokenFrom: OrcaToken,
        tokenFromAmount: Decimal,
        slippage: Decimal,
        swapFee: Decimal,
        userId: string,
        blockhash: string
    }): Promise<string> {
        try {
            const quote = await this.getSwapQuote(
                params.pool,
                params.tokenFrom,
                params.tokenFromAmount,
                params.slippage
            );

            const swapPayload = await params.pool.swap(
                params.keypair,
                params.tokenFrom,
                params.tokenFromAmount,
                quote.getMinOutputAmount()
            );

            const transaction = swapPayload.transaction;

            // Use getFeeForMessage to get the fee for the transaction
            const message = new TransactionMessage({
                payerKey: params.keypair.publicKey,
                recentBlockhash: params.blockhash,
                instructions: transaction.instructions
            }).compileToV0Message();

            const { value: fee } = await this.connection.getFeeForMessage(message);

            transaction.feePayer = params.keypair.publicKey;
            transaction.recentBlockhash = params.blockhash;

            transaction.sign(params.keypair);

            const rawTransaction = transaction.serialize();
            const signature = await this.connection.sendRawTransaction(
                rawTransaction,
                {
                    skipPreflight: false,
                    maxRetries: 3,
                    preflightCommitment: 'confirmed'
                }
            );

            await this.connection.confirmTransaction({
                signature,
                blockhash: params.blockhash,
                lastValidBlockHeight: (await this.connection.getLatestBlockhash()).lastValidBlockHeight
            });

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
            this.logger.error('Swap failed:', {
                error: error.message,
                stack: error.stack,
                details: error
            });
            throw new BadRequestException(error.message || 'Swap operation failed');
        }
    }
}