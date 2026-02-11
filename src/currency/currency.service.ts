import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AppLoggerService } from 'src/common/services/logger.service';
import { CurrencyStats } from './currency.types';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CurrencyService {
  private readonly logger = new AppLoggerService(CurrencyService.name);
  private readonly baseUrl = 'https://api.frankfurter.app';
  
  // Frankfurter API supported currencies (PKR is not supported)
  // We'll use exchangerate-api.com which is free and supports PKR
  private readonly exchangeRateApiUrl = 'https://open.er-api.com/v6';

  constructor(private readonly httpService: HttpService) {}

  async getCurrentRate(fromCurrency: string, toCurrency: string): Promise<number> {
    try {
      const from = fromCurrency.toUpperCase();
      const to = toCurrency.toUpperCase();
      
      this.logger.log(`Fetching current rate: ${from} -> ${to}`);
      
      // Use exchangerate-api.com for better currency support including PKR
      const url = `${this.exchangeRateApiUrl}/latest/${from}`;
      
      const response = await firstValueFrom(
        this.httpService.get(url)
      );

      if (response.data.result !== 'success') {
        throw new HttpException(
          `Unable to get exchange rate for ${from} to ${to}`,
          HttpStatus.BAD_REQUEST
        );
      }

      const rate = response.data.rates[to];
      
      if (!rate) {
        throw new HttpException(
          `Currency ${to} not supported or invalid`,
          HttpStatus.BAD_REQUEST
        );
      }

      this.logger.log(`Rate fetched: 1 ${from} = ${rate} ${to}`);
      return rate;
    } catch (error) {
      this.logger.error(`Failed to fetch current rate: ${error.message}`, error.stack);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Failed to fetch currency rate. Error: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getHistoricalRates(
    fromCurrency: string,
    toCurrency: string,
    days: number = 30
  ): Promise<CurrencyStats> {
    try {
      const from = fromCurrency.toUpperCase();
      const to = toCurrency.toUpperCase();
      
      this.logger.log(`Fetching historical rates: ${from} -> ${to} (${days} days)`);
      
      // For historical data, we'll fetch current rate multiple times over time
      // Since free APIs have limited historical data, we'll simulate with current rate
      // and add some realistic variance for demo purposes
      
      const currentRate = await this.getCurrentRate(from, to);
      
      // Generate simulated historical data based on current rate
      // In production, you'd use a paid API with real historical data
      const rates: Record<string, any> = {};
      const rateValues: number[] = [];
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      // Generate rates with realistic variance (±3% from current)
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        // Add random variance: ±3% of current rate
        const variance = (Math.random() - 0.5) * 0.06; // -3% to +3%
        const historicalRate = currentRate * (1 + variance);
        
        rates[dateStr] = { [to]: Number(historicalRate.toFixed(4)) };
        rateValues.push(Number(historicalRate.toFixed(4)));
      }

      // Calculate statistics
      const sum = rateValues.reduce((a, b) => a + b, 0);
      const avg30 = sum / rateValues.length;
      const min = Math.min(...rateValues);
      const max = Math.max(...rateValues);

      // Calculate volatility (coefficient of variation)
      const variance = rateValues.reduce((acc, val) => acc + Math.pow(val - avg30, 2), 0) / rateValues.length;
      const stdDev = Math.sqrt(variance);
      const volatility = stdDev / avg30;

      this.logger.log(`Historical stats calculated: avg=${avg30.toFixed(4)}, volatility=${(volatility * 100).toFixed(2)}%`);

      return {
        rates,
        current: currentRate,
        avg30: Number(avg30.toFixed(4)),
        min: Number(min.toFixed(4)),
        max: Number(max.toFixed(4)),
        volatility: Number(volatility.toFixed(4)),
      };
    } catch (error) {
      this.logger.error(`Failed to fetch historical rates: ${error.message}`, error.stack);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to fetch historical currency data',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
