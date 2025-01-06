import { CreatePoolDto } from './dto/create-pool.dto';
import { UpdatePoolDto } from './dto/update-pool.dto';
import { TransactionSignature } from '@solana/web3.js';
import {
    Injectable,
    InternalServerErrorException,
    BadRequestException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { WithdrawQuote } from '@orca-so/sdk';
import * as web3 from '@solana/web3.js';
import { BalanceInterface } from './interface/balance.interface';
import { DepositInterface } from './interface/deposit.interface';
import { WithdrawInterface } from './interface/withdraw.interface';
import { getPoolDepositQuote, getPoolFromTokens, getTokenFromPool, getWithdrawQuote, isDepositedPool, poolDeposit, poolWithdraw } from 'src/orca/pool';
import { hasEnoughSPLFunds, hasFunds } from 'src/orca/orca-utils';
import { InjectModel } from '@nestjs/mongoose';
import { Wallet } from 'src/solana/schemas/wallet.schema';
import { SolanaService } from 'src/solana/solana.service';
import { Model } from 'mongoose';
import { TransactionDocument  } from 'src/solana/schemas/transaction.schema';
import { getSwapQuote, swap } from 'src/orca/swap';
import { CONFIG } from 'src/orca/config';

@Injectable()
export class PoolService {

    private readonly logger = new Logger(PoolService.name);

    constructor(
      @InjectModel(Wallet.name) private walletModel: Model<Wallet>,
      @InjectModel(TransactionDocument .name) private transactionModel: Model<TransactionDocument >,
      private readonly solanaService: SolanaService
    ) {}

  async balance(i: BalanceInterface): Promise<WithdrawQuote> {
    const pool = getPoolFromTokens(i.network, i.tokenA, i.tokenB);
    return getWithdrawQuote(pool, i.publicKey);
}

async deposit(i: DepositInterface): Promise<TransactionSignature> {
    if (
        !hasEnoughSPLFunds(
            i.connection,
            i.keypair.publicKey,
            i.tokenA,
            i.tokenAAmount,
        ) ||
        !hasEnoughSPLFunds(
            i.connection,
            i.keypair.publicKey,
            i.tokenB,
            i.tokenBAmount,
        )
    ) {
        throw new BadRequestException({
            desription: 'Account does not have enough funds.',
        });
    }

    if (!hasFunds(i.connection, i.keypair.publicKey, i.depositFee)) {
        throw new BadRequestException({
            desription: 'Account does not have enough funds to pay fees.',
        });
    }

    const poolDepositQuote = await getPoolDepositQuote(
        i.pool,
        i.tokenAAmount,
        i.tokenBAmount,
        i.slippage,
    );

    const poolDepositTxPayload = await poolDeposit(
        i.pool,
        poolDepositQuote,
        i.keypair,
    );

    try {
        return await poolDepositTxPayload.execute();
    } catch (error) {
        throw new InternalServerErrorException({
            description: error,
        });
    }
}

async withdraw(i: WithdrawInterface): Promise<TransactionSignature> {
    const withdrawQuote = await getWithdrawQuote(
        i.pool,
        i.keypair.publicKey,
    );

    if (!isDepositedPool(withdrawQuote)) {
        throw new BadRequestException({
            desription: `Pool with tokens [${i.pool.getTokenA().tag
                }] and [${i.pool.getTokenB().tag}] has nothing to withdraw.`,
        });
    }

    if (!hasFunds(i.connection, i.keypair.publicKey, i.withdrawFee)) {
        throw new BadRequestException({
            desription: 'Account does not have enough funds to pay fees.',
        });
    }

    const poolWithdrawTxPayload = await poolWithdraw(
        i.pool,
        i.keypair,
        withdrawQuote,
    );

    try {
        return await poolWithdrawTxPayload.execute();
    } catch (error) {
        throw new InternalServerErrorException({
            description: error,
        });
    }
}

 
  create(createPoolDto: CreatePoolDto) {
    return 'This action adds a new pool';
  }

  findAll() {
    return `This action returns all pool`;
  }

  findOne(id: number) {
    return `This action returns a #${id} pool`;
  }

  update(id: number, updatePoolDto: UpdatePoolDto) {
    return `This action updates a #${id} pool`;
  }

  remove(id: number) {
    return `This action removes a #${id} pool`;
  }
}
