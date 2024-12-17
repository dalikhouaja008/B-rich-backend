import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, BadRequestException } from '@nestjs/common';
import { PoolService } from './pool.service';
import { CreatePoolDto } from './dto/create-pool.dto';
import { UpdatePoolDto } from './dto/update-pool.dto';
import { PoolWithdrawDto } from './dto/withdraw.dto';
import { getConnection, keypairFromBs58 } from 'src/orca/solana.utils';
import { getPoolFromTokens, getPools } from 'src/orca/pool';
import { CONFIG } from 'src/orca/config';
import { alignPoolTokensAndAmounts, getSlippage } from 'src/orca/orca-utils';
import { PoolDepositDto } from './dto/deposit.dto';
import { PublicKey } from '@solana/web3.js';
import { PoolBalanceDto } from './dto/balance.dto';

@Controller('pool')
export class PoolController {
  constructor(private readonly poolService: PoolService) {}
  @Post('balance')
  @HttpCode(200)
  async balance(@Body() dto: PoolBalanceDto) {
      return this.poolService.balance({
          network: dto.network,
          tokenA: dto.tokenA,
          tokenB: dto.tokenB,
          publicKey: new PublicKey(dto.publicKey),
      });
  }

  @Post('deposit')
  @HttpCode(200)
  async deposit(@Body() dto: PoolDepositDto) {
      const connection = getConnection(dto.network);

      // FIXME: move outside of the execution REST API
      const keypair = keypairFromBs58(dto.publicKey, dto.secretKey);

      const pool = getPoolFromTokens(dto.network, dto.tokenA, dto.tokenB);

      const tokenA = pool.getTokenA();
      const tokenB = pool.getTokenB();
      const [tokenAAmount, tokenBAmount] = alignPoolTokensAndAmounts(
          tokenA,
          dto.tokenA,
          dto.tokenAAmount,
          dto.tokenBAmount,
      );

      const slippage = getSlippage(dto.slippage);

      const depositFee = CONFIG.POOL_DEPOSIT_FEE;

      return this.poolService.deposit({
          connection,
          keypair,
          pool,
          tokenA,
          tokenB,
          tokenAAmount,
          tokenBAmount,
          slippage,
          depositFee,
      });
  }

  @Post('withdraw')
  @HttpCode(200)
  async withdraw(@Body() dto: PoolWithdrawDto) {
      try {
          const connection = getConnection(dto.network);

          // FIXME: move outside of the execution REST API
          const keypair = keypairFromBs58(dto.publicKey, dto.secretKey);

          const pool = getPoolFromTokens(dto.network, dto.tokenA, dto.tokenB);

          const withdrawFee = CONFIG.WITHDRAW_FEE;

          return await this.poolService.withdraw({
              connection,
              keypair,
              pool,
              withdrawFee,
          });
      } catch (error) {
          throw new BadRequestException({
              description: error,
          });
      }
  }
  @Get('getPools')
  @HttpCode(200)
  async farm() {
      return getPools();
  }
  @Post()
  create(@Body() createPoolDto: CreatePoolDto) {
    return this.poolService.create(createPoolDto);
  }

  @Get()
  findAll() {
    return this.poolService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.poolService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePoolDto: UpdatePoolDto) {
    return this.poolService.update(+id, updatePoolDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.poolService.remove(+id);
  }
}
