import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiProperty, ApiTags, ApiResponse as SwaggerResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User, UserRole } from '@db';
import { ApiResponse } from 'src/common/types';
import { CurrencyService } from './currency.service';
import { CurrencyAnalyzerService } from './currency-analyzer.service';
import { AnalyzeTransferDto, GetRateQueryDto, GetTrendsQueryDto } from './dto/currency.dto';
import { CurrencyStats, CurrencyAnalysisResponse } from './currency.types';

@Controller('currency')
@ApiTags('Currency Exchange & Analysis')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class CurrencyController {
  constructor(
    private readonly currencyService: CurrencyService,
    private readonly currencyAnalyzerService: CurrencyAnalyzerService,
  ) {}

  @Roles(...Object.values(UserRole))
  @Get('rate')
  @ApiProperty({ title: 'Get Current Exchange Rate', description: 'Get the current exchange rate between two currencies' })
  @SwaggerResponse({ status: 200, description: 'Current exchange rate retrieved successfully' })
  @SwaggerResponse({ status: 400, description: 'Invalid currency codes' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentRate(@Query() query: GetRateQueryDto): Promise<ApiResponse<{ rate: number; from: string; to: string }>> {
    const rate = await this.currencyService.getCurrentRate(query.from, query.to);

    return {
      message: 'Current exchange rate retrieved successfully',
      success: true,
      data: {
        rate,
        from: query.from.toUpperCase(),
        to: query.to.toUpperCase(),
      },
    };
  }

  @Roles(...Object.values(UserRole))
  @Get('trends')
  @ApiProperty({ title: 'Get Currency Trends', description: 'Get historical exchange rate trends and statistics' })
  @SwaggerResponse({ status: 200, description: 'Currency trends retrieved successfully' })
  @SwaggerResponse({ status: 400, description: 'Invalid currency codes or date range' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  async getTrends(@Query() query: GetTrendsQueryDto): Promise<ApiResponse<CurrencyStats>> {
    const days = query.days || 30;
    const stats = await this.currencyService.getHistoricalRates(query.from, query.to, days);

    return {
      message: 'Currency trends retrieved successfully',
      success: true,
      data: stats,
    };
  }

  @Roles(...Object.values(UserRole))
  @Post('analyze')
  @ApiProperty({ 
    title: 'Analyze Currency Transfer', 
    description: 'Get AI-powered recommendations for currency transfer timing',
    type: AnalyzeTransferDto 
  })
  @SwaggerResponse({ 
    status: 200, 
    description: 'Transfer analysis completed successfully',
    schema: {
      example: {
        message: 'Transfer analysis completed successfully',
        success: true,
        data: {
          currentRate: 278.50,
          historicalData: {
            current: 278.50,
            avg30: 275.20,
            min: 270.15,
            max: 281.30,
            volatility: 0.015
          },
          recommendation: {
            recommendation: 'wait',
            reasoning: 'Current rate is 1.2% above 30-day average with low volatility',
            potentialSavings: 82500,
            riskLevel: 'low',
            suggestedTimeframe: '1-3 days',
            confidenceScore: 0.78
          },
          estimatedAmount: 13925000
        }
      }
    }
  })
  @SwaggerResponse({ status: 400, description: 'Invalid input data' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  async analyzeTransfer(
    @Body() dto: AnalyzeTransferDto,
    @CurrentUser() user: User,
  ): Promise<ApiResponse<CurrencyAnalysisResponse>> {
    // Fetch historical data
    const historicalData = await this.currencyService.getHistoricalRates(
      dto.fromCurrency,
      dto.toCurrency,
      30
    );

    // Get AI recommendation
    const recommendation = await this.currencyAnalyzerService.analyzeTransfer(
      dto.amount,
      dto.fromCurrency,
      dto.toCurrency,
      historicalData
    );

    // Calculate estimated amount
    const estimatedAmount = dto.amount * historicalData.current;

    return {
      message: 'Transfer analysis completed successfully',
      success: true,
      data: {
        currentRate: historicalData.current,
        historicalData,
        recommendation,
        estimatedAmount: Number(estimatedAmount.toFixed(2)),
      },
    };
  }
}
