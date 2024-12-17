import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateSwapDto } from './dto/create-swap.dto';
import { UpdateSwapDto } from './dto/update-swap.dto';
import { SwapInterface } from './interface/swap.interface';
import { hasEnoughFunds } from 'src/orca/orca-utils';
import { TransactionSignature } from '@solana/web3.js';
import { swap, getSwapQuote } from 'src/orca/swap';


@Injectable()
export class SwapService {
  async swap(i: SwapInterface): Promise<TransactionSignature> {
    if (
        !(await hasEnoughFunds(
            i.connection,
            i.keypair.publicKey,
            i.tokenFrom,
            i.tokenFromAmount,
            i.swapFee,
        ))
    ) {
        throw new BadRequestException({
            desription: 'Account does not have enough funds.',
        });
    }

    const swapQuote = await getSwapQuote(
        i.pool,
        i.tokenFrom,
        i.tokenFromAmount,
        i.slippage,
    );

    const swapTxPayload = await swap(i.pool, i.keypair, swapQuote);

    try {
        return await swapTxPayload.execute();
    } catch (error) {
        throw new InternalServerErrorException({
            description: error,
        });
    }
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
