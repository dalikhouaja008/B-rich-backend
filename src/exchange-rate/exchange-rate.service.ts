import { CreateExchangeRateDto } from './dto/create-exchange-rate.dto';
import { UpdateExchangeRateDto } from './dto/update-exchange-rate.dto';
import { Injectable, Logger } from '@nestjs/common';
import { ExchangeRate } from './entities/exchange-rate.entity';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class ExchangeRateService {

  constructor(@InjectModel(ExchangeRate.name) private exchangeModel: Model<ExchangeRate>) { }


  /*async createExchangeRates(exchangeRates: CreateExchangeRateDto[]): Promise<ExchangeRate[]> {
    const createdRates = await this.exchangeModel.insertMany(exchangeRates);
    return createdRates;
  }*/

  async create(exchangeRateData): Promise<ExchangeRate> {
    const createdExchangeRate = new this.exchangeModel(exchangeRateData);
    return createdExchangeRate.save();
  }

  async findAll(): Promise<ExchangeRate[]> {
    return this.exchangeModel.find().exec();
  }

  findOne(id: number) {
    return `This action returns a #${id} exchangeRate`;
  }

  update(id: number, updateExchangeRateDto: UpdateExchangeRateDto) {
    return `This action updates a #${id} exchangeRate`;
  }

  remove(id: number) {
    return `This action removes a #${id} exchangeRate`;
  }


}


