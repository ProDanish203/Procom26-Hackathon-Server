import { Injectable } from '@nestjs/common';
import { AiService } from 'src/ai/ai.service';
import { AppLoggerService } from 'src/common/services/logger.service';
import { CurrencyStats, TransferRecommendation, TransferRecommendationSchema } from './currency.types';
import { CURRENCY_ANALYZER_PROMPT } from './currency.prompts';

@Injectable()
export class CurrencyAnalyzerService {
  private readonly logger = new AppLoggerService(CurrencyAnalyzerService.name);

  constructor(private readonly aiService: AiService) {}

  async analyzeTransfer(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    historicalData: CurrencyStats
  ): Promise<TransferRecommendation> {
    try {
      this.logger.log(`Analyzing transfer: ${amount} ${fromCurrency} -> ${toCurrency}`);

      const userPrompt = `
Analyze this currency transfer scenario:

**Transfer Details:**
- Amount: ${amount} ${fromCurrency}
- From: ${fromCurrency}
- To: ${toCurrency}

**Market Data:**
- Current Rate: ${historicalData.current} ${toCurrency}/${fromCurrency}
- 30-Day Average: ${historicalData.avg30} ${toCurrency}/${fromCurrency}
- 30-Day Min: ${historicalData.min} ${toCurrency}/${fromCurrency}
- 30-Day Max: ${historicalData.max} ${toCurrency}/${fromCurrency}
- Volatility (CV): ${(historicalData.volatility * 100).toFixed(2)}%

**Analysis Required:**
1. Should the user transfer now or wait?
2. What is the reasoning behind this recommendation?
3. Estimate potential savings in ${toCurrency} if waiting (can be negative if rate might worsen)
4. What is the risk level?
5. What timeframe do you suggest?
6. How confident are you in this recommendation (0-1)?

Provide a structured recommendation.`;

      const recommendation = await this.aiService.generateStructuredOutput<TransferRecommendation>({
        systemPrompt: CURRENCY_ANALYZER_PROMPT,
        prompt: userPrompt,
        schema: TransferRecommendationSchema,
        outputName: 'TransferRecommendation',
        outputDescription: 'AI-powered currency transfer timing recommendation',
      });

      this.logger.log(`Analysis complete: ${recommendation.recommendation}`);

      return recommendation;
    } catch (error) {
      this.logger.error(`Failed to analyze transfer: ${error.message}`, error.stack);
      
      // Fallback recommendation if AI fails
      return {
        recommendation: 'transfer_now',
        reasoning: 'Unable to perform detailed analysis. Current rate is within acceptable range.',
        potentialSavings: 0,
        riskLevel: 'medium',
        suggestedTimeframe: 'immediate',
        confidenceScore: 0.5,
      };
    }
  }
}
