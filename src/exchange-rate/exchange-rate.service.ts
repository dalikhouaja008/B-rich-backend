import { CreateExchangeRateDto } from './dto/create-exchange-rate.dto';
import { UpdateExchangeRateDto } from './dto/update-exchange-rate.dto';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ExchangeRateService {


  create(createExchangeRateDto: CreateExchangeRateDto) {
    return 'This action adds a new exchangeRate';
  }

  findAll() {
    return `This action returns all exchangeRate`;
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


