import { Controller, Get, Post, Body, Patch, Param, Delete, Query, NotFoundException, BadRequestException } from '@nestjs/common';
import { OrcaService } from './orca.service';
import { CreateOrcaDto } from './dto/create-orca.dto';
import { UpdateOrcaDto } from './dto/update-orca.dto';


@Controller('orca')
export class OrcaController {
  constructor(private readonly orcaService: OrcaService) {}

  @Post('pool-info')
  async getPoolInfo(
    @Body('tokenA') tokenA: string,
    @Body('tokenB') tokenB: string
  ) {
    return this.orcaService.getPoolInfo(tokenA, tokenB);
  }

  @Get('pools-details')
  async getPoolsDetails() {
    return this.orcaService.getAvailablePools(); 
  }

  @Get('pool-details')
  async getSpecificPoolDetails(
    @Query('tokenA') tokenA: string,
    @Query('tokenB') tokenB: string
  ) {
    try {
      const poolInfo = await this.orcaService.getPoolInfo(tokenA, tokenB);

      if (!poolInfo) {
        throw new NotFoundException('Pool not found');
      }

      return this.orcaService.getPoolDetails(poolInfo, tokenA, tokenB);
    } catch (error) {
      console.error('Error in getSpecificPoolDetails', error);
      throw new BadRequestException(`Unable to retrieve pool details: ${error.message}`);
    }
  }

 /*/ @Post('execute')
  async executeSwap(
    @Body('userId') userId: string,
    @Body('fromWalletPublicKey') fromWalletPublicKey: string,
    @Body('inputToken') inputToken: string,
    @Body('outputToken') outputToken: string,
    @Body('amount') amount: number
  ) {
    return this.orcaService.executeSwap(
      userId, 
      fromWalletPublicKey, 
      inputToken, 
      outputToken, 
      amount
    );
  }*/

  @Post('swap-sol-orca')
  async swapSolForOrca(
    @Body('amount') amount: number,
    @Body('walletPublicKey') walletPublicKey: string
  ) {
    return this.orcaService.swapSolForOrca(amount, walletPublicKey);
  }

  @Post('deposit-pool')
  async depositToPool(
    @Body('amount') amount: number,
    @Body('walletPublicKey') walletPublicKey: string
  ) {
    return this.orcaService.depositToPool(amount, walletPublicKey);
  }

  @Post('deposit-farm')
  async depositToFarm(@Body('walletPublicKey') walletPublicKey: string) {
    return this.orcaService.depositToFarm(walletPublicKey);
  }

  @Post('withdraw-farm')
  async withdrawFromFarm(@Body('walletPublicKey') walletPublicKey: string) {
    return this.orcaService.withdrawFromFarm(walletPublicKey);
  }

  @Post('withdraw-pool')
  async withdrawFromPool(@Body('walletPublicKey') walletPublicKey: string) {
    return this.orcaService.withdrawFromPool(walletPublicKey);
  }

  @Post()
  create(@Body() createOrcaDto: CreateOrcaDto) {
    return this.orcaService.create(createOrcaDto);
  }

  @Get()
  findAll() {
    return this.orcaService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orcaService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOrcaDto: UpdateOrcaDto) {
    return this.orcaService.update(+id, updateOrcaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.orcaService.remove(+id);
  }
}