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
    const createdRates = await this.exchangeModel.insertMany(exchan
      geRates);
    return createdRates;
  }*/

  async create(exchangeRateData): Promise<ExchangeRate> {
    const createdExchangeRate = new this.exchangeModel(exchangeRateData);
    return createdExchangeRate.save();
  }

  async findAll(): Promise<ExchangeRate[]> {
    return this.exchangeModel.find({
      date: {
        $gte: new Date().setHours(0, 0, 0, 0),
        $lt: new Date().setHours(24, 0, 0, 0)
      }
    }).exec();
  }
  async findRateByCurrency(currency: string): Promise<ExchangeRate> {
    // Définir la date de début et de fin pour la recherche
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0); // Début de la journée
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999); // Fin de la journée
    try {
        // Rechercher le taux de change dans la base de données
        const exchangeRate = await this.exchangeModel.findOne({
            date: {
                $gte: startOfDay,
                $lt: endOfDay
            },
            code: currency
        }).exec();

        return exchangeRate;
    } catch (error) {
        console.error('Erreur lors de la récupération du taux de change:', error);
        throw new Error('Impossible de récupérer le taux de change.');
    }
}

async getConvertedAmountfromTNDtoOtherCurrency(amount: number, currency: string): Promise<Number> {
  try {
      // Récupérer le taux de change pour la devise spécifiée
      const exchangeRate = await this.findRateByCurrency(currency);
      if (!exchangeRate) {
          throw new Error(`Taux de change non trouvé pour la devise: ${currency}`);
      }
      // Calculer le montant converti
      const convertedAmount = amount * Number(exchangeRate.unit) /  Number( exchangeRate.sellingRate); 

      return convertedAmount;
  } catch (error) {
      console.error('Erreur lors de la conversion du montant:', error);
      throw new Error('Impossible de convertir le montant.');
  }
}

async getConvertedAmountFromOtherCurrencyToTND(amount: number, currency: string): Promise<Number> {
  try {
      // Récupérer le taux de change pour la devise spécifiée
      const exchangeRate = await this.findRateByCurrency(currency);
      if (!exchangeRate) {
          throw new Error(`Taux de change non trouvé pour la devise: ${currency}`);
      }
      // Calculer le montant converti
      const convertedAmount = amount * Number(exchangeRate.buyingRate) /  Number( exchangeRate.unit); 
      return convertedAmount;
  } catch (error) {
      console.error('Erreur lors de la conversion du montant:', error);
      throw new Error('Impossible de convertir le montant.');
  }
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




  convertCurrency(amount: number, fromCurrency: string, toCurrency: string, rates: Record<string, number>): number {
    const usdAmount = amount / rates[fromCurrency];
    return usdAmount * rates[toCurrency];
  }


  /*async findSellingRateByUnit(unit: string): Promise<string | null> {
    const exchangeRate = await this.exchangeModel.findOne({ unit }).select('sellingRate').exec();
    return exchangeRate ? exchangeRate.sellingRate : null; 
}*/

}


