import { Module } from '@nestjs/common';
import { ExchangeRateService } from './exchange-rate.service';
import { ExchangeRateController } from './exchange-rate.controller';
import { ExchangeRate, exchangeRateShcema } from './entities/exchange-rate.entity';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports:  [MongooseModule.forFeature([{name:ExchangeRate.name, schema:exchangeRateShcema}])],
  controllers: [ExchangeRateController],
  providers: [ExchangeRateService]
})
export class ExchangeRateModule {}
