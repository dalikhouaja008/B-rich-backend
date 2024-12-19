import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode } from '@nestjs/common';
import { FarmService } from './farm.service';
import { CreateFarmDto } from './dto/create-farm.dto';
import { UpdateFarmDto } from './dto/update-farm.dto';
import { keypairFromBs58 } from 'src/orca/solana.utils';
import { getFarmFromTokens, getFarms } from 'src/orca/farm';
import { FarmDepositDto } from './dto/farm-deposit.dto';
import { getPoolFromTokens } from 'src/orca/pool';
import { PublicKey } from '@solana/web3.js';
import { FarmBalanceDto } from './dto/farm-balance.dto';
import { FarmWithdrawtDto } from './dto/farm-withdraw.dto';

@Controller('farm')
export class FarmController {
  constructor(private readonly farmService: FarmService) {}

  @Get()
  @HttpCode(200)
  async farm() {
      return getFarms();
  }

  @Post('balance')
  @HttpCode(200)
  async balance(@Body() dto: FarmBalanceDto) {
      const farm = getFarmFromTokens(
          dto.network,
          dto.tokenA,
          dto.tokenB,
          dto.farmType,
      );
      const publicKey = new PublicKey(dto.publicKey);
      return await this.farmService.balance({
          farm,
          publicKey,
      });
  }

  @Post('deposit')
  @HttpCode(200)
  async deposit(@Body() dto: FarmDepositDto) {
      const pool = getPoolFromTokens(
          dto.network,
          dto.tokenA,
          dto.tokenB,
      );
      const farm = getFarmFromTokens(
          dto.network,
          dto.tokenA,
          dto.tokenB,
          dto.farmType,
      );

      // FIXME: move outside of the execution REST API
      const keypair = keypairFromBs58(dto.publicKey, dto.secretKey);

      return await this.farmService.deposit({
          farm,
          pool,
          keypair,
      });
  }

  @Post('withdraw')
  @HttpCode(200)
  async withdraw(@Body() dto: FarmWithdrawtDto) {
      const farm = getFarmFromTokens(
          dto.network,
          dto.tokenA,
          dto.tokenB,
          dto.farmType,
      );

      // FIXME: move outside of the execution REST API
      const keypair = keypairFromBs58(dto.publicKey, dto.secretKey);

      return await this.farmService.withdraw({
          farm,
          keypair,
      });
  }
  @Post()
  create(@Body() createFarmDto: CreateFarmDto) {
    return this.farmService.create(createFarmDto);
  }

  @Get()
  findAll() {
    return this.farmService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.farmService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateFarmDto: UpdateFarmDto) {
    return this.farmService.update(+id, updateFarmDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.farmService.remove(+id);
  }
}
