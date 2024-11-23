import { Controller, Get, Post, Body, Patch, Param, Delete, Logger } from '@nestjs/common';
import { ExchangeRateService } from './exchange-rate.service';
import { CreateExchangeRateDto } from './dto/create-exchange-rate.dto';
import { UpdateExchangeRateDto } from './dto/update-exchange-rate.dto';
import * as puppeteer from 'puppeteer';
import { ExchangeRate } from './entities/exchange-rate.entity';
import { Cron } from '@nestjs/schedule';
//import { ExchangeRate } from './entities/exchange-rate.entity';

/*interface ExchangeRate {
  designation: string;
  code: string;
  unit: string;
  buyingRate: string;
  sellingRate: string;
  date: Date;
}*/


@Controller('exchange-rate')
export class ExchangeRateController {

  private readonly logger = new Logger(ExchangeRateController.name);
  constructor(private readonly exchangeRateService: ExchangeRateService) { }

  //Monday to Friday at 9:30am
  @Cron('0 30 9 * * 1-5')
  @Get('scrapper')
  async scrapeExchangeRates(): Promise<ExchangeRate[]> {
    this.logger.log('Démarrage du scraping');
    let browser = null;

    try {
      // Lancement du navigateur avec des options de base
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
        ]
      });

      const page = await browser.newPage();
      
      // Configuration du user agent pour simuler un navigateur normal
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');

      // Navigation vers la page
      const response = await page.goto('https://www.biat.tn/biat/Fr/cours-de-change-bbe_66_127', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      if (!response.ok()) {
        throw new Error(`Erreur HTTP: ${response.status()}`);
      }

      // Attendre que le tableau soit chargé
      await page.waitForSelector('.table_conv table tbody tr', { timeout: 10000 });

      // Extraction des données
      const rates = await page.evaluate(() => {
        const rows = document.querySelectorAll('.table_conv table tbody tr');
        const exchangeRates = [];

        rows.forEach((row) => {
          try {
            const columns = row.querySelectorAll('td');
            if (columns.length < 5) return;

            const designation = columns[0]?.textContent?.trim() || '';
            const code = columns[1]?.textContent?.trim() || '';
            const unit = columns[2]?.textContent?.trim() || '0';
            const buyingRateRaw = columns[3]?.textContent?.trim() || '0';
            const sellingRateRaw = columns[4]?.textContent?.trim() || '0';

            const buyingRateFixed = buyingRateRaw.startsWith('.') ? `0${buyingRateRaw}` : buyingRateRaw;
            const sellingRateFixed = sellingRateRaw.startsWith('.') ? `0${sellingRateRaw}` : sellingRateRaw;

            const buyingRate = parseFloat(buyingRateFixed);
            const sellingRate = parseFloat(sellingRateFixed);

            if (isNaN(buyingRate) || isNaN(sellingRate)) {
              console.warn('Données invalides:', { designation, code, buyingRateRaw, sellingRateRaw });
              return;
            }

            exchangeRates.push({
              designation,
              code,
              unit: unit.toString(),
              buyingRate: buyingRate.toFixed(3),
              sellingRate: sellingRate.toFixed(3),
              date: new Date().toISOString().split('T')[0],
            });
          } catch (error) {
            console.error('Erreur lors du traitement d\'une ligne:', error);
          }
        });
        // Enregistrer chaque taux de change dans la base de données
     
        return exchangeRates;
      });

      if (rates.length === 0) {
        throw new Error('Aucune donnée n\'a pu être extraite');
      }

      this.logger.log(`Extraction réussie: ${rates.length} taux de change extraits`);
      for (const rate of rates) {
        this.logger.log(`added data`);
        await this.exchangeRateService.create(rate);
    }
      return rates;

    } catch (error) {
      this.logger.error('Erreur lors du scraping:', error);
      throw new Error(`Échec du scraping: ${error.message}`);
    } finally {
      if (browser) {
        try {
          await browser.close();
          this.logger.log('Navigateur fermé avec succès');
        } catch (error) {
          this.logger.error('Erreur lors de la fermeture du navigateur:', error);
        }
      }
    }
  }
  
  /*@Post()
  create(@Body() createExchangeRateDto: CreateExchangeRateDto) {
    return this.exchangeRateService.create(createExchangeRateDto);
  }*/
@Get('sellingRate/:currency/:amount')
  async CalculateSellingRate(@Param('currency') currency: string,@Param('amount') amount:String): Promise<Number> {

    const numericAmount =Number(amount);
    if(isNaN(numericAmount)){
      throw new Error('Amount must be a number');
    }

    return this.exchangeRateService.getConvertedAmountfromTNDtoOtherCurrency(numericAmount,currency);
  }
  @Get('buyingRate/:currency/:amount')
  async calculateBuyingRate(@Param('currency') currency: string,@Param('amount') amount:number): Promise<Number> {
    return this.exchangeRateService.getConvertedAmountFromOtherCurrencyToTND(amount,currency);
  }



  @Get()
  async findAll():Promise<CreateExchangeRateDto[]> {
    return this.exchangeRateService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.exchangeRateService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateExchangeRateDto: UpdateExchangeRateDto) {
    return this.exchangeRateService.update(+id, updateExchangeRateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.exchangeRateService.remove(+id);
  }


}
