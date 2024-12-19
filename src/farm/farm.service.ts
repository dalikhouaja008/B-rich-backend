import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateFarmDto } from './dto/create-farm.dto';
import { UpdateFarmDto } from './dto/update-farm.dto';
import { FarmBalanceInterface } from './interface/farm-balance.interface';
import { FarmDepositInterface } from './interface/farm-deposit.interface';
import { farmDeposit, farmWithdraw } from 'src/orca/farm';
import { FarmWithdrawInterface } from './interface/farm-withdraw.interface';

@Injectable()
export class FarmService {
  async balance(i: FarmBalanceInterface) {
    return await i.farm.getFarmBalance(i.publicKey);
}
async deposit(i: FarmDepositInterface) {
  try {
      // Deposit every LP token from pool to farm.
      const farmDepositTxPayload = await farmDeposit(
          i.farm,
          i.pool,
          i.keypair,
      );

      return await farmDepositTxPayload.execute();
  } catch (error) {
      throw new InternalServerErrorException({
          description: error,
      });
  }
}

async withdraw(i: FarmWithdrawInterface) {
  try {
      const farmWithdrawTxPayload = await farmWithdraw(
          i.farm,
          i.keypair,
      );

      return await farmWithdrawTxPayload.execute();
  } catch (error) {
      throw new InternalServerErrorException({
          description: error,
      });
  }
}
  create(createFarmDto: CreateFarmDto) {
    return 'This action adds a new farm';
  }

  findAll() {
    return `This action returns all farm`;
  }

  findOne(id: number) {
    return `This action returns a #${id} farm`;
  }

  update(id: number, updateFarmDto: UpdateFarmDto) {
    return `This action updates a #${id} farm`;
  }

  remove(id: number) {
    return `This action removes a #${id} farm`;
  }
}
