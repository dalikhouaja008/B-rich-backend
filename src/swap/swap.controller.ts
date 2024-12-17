import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, BadRequestException } from '@nestjs/common';
import { SwapService } from './swap.service';
import { CreateSwapDto } from './dto/create-swap.dto';
import { UpdateSwapDto } from './dto/update-swap.dto';
import { SwapDto } from './dto/swap.dto';
import { getPoolAddress, getPoolName, getTokenFromPool } from 'src/orca/pool';
import { getConnection, getNetwork, keypairFromBs58 } from 'src/orca/solana.utils';
import { getOrca } from '@orca-so/sdk';
import Decimal from 'decimal.js';
import { getSlippage } from 'src/orca/orca-utils';
import { CONFIG } from 'src/orca/config';
@Controller('swap')
export class SwapController {
  constructor(private readonly swapService: SwapService) {}
  @Post()
  @HttpCode(200)
  async balance(@Body() dto: SwapDto) {
      const poolName = getPoolName(dto.tokenFrom, dto.tokenTo);

      if (poolName) {
          // FIXME: move outside of the execution REST API
          const keypair = keypairFromBs58(dto.publicKey, dto.secretKey);
          const connection = getConnection(dto.network);
          const orca = getOrca(connection, getNetwork(dto.network));

          const poolAddress = getPoolAddress(poolName);
          const pool = orca.getPool(poolAddress);
          const tokenFrom = getTokenFromPool(pool, dto.tokenFrom);
          const tokenFromAmount = new Decimal(dto.tokenFromAmount);
          const slippage = getSlippage(dto.slippage);
          const swapFee = CONFIG.SWAP_FEE;

          return this.swapService.swap({
              connection,
              keypair,
              pool,
              tokenFrom,
              tokenFromAmount,
              slippage,
              swapFee,
          });
      }

      throw new BadRequestException({
          desription: `Non-existent pool with tokens [${dto.tokenFrom}] and [${dto.tokenTo}].`,
      });
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
