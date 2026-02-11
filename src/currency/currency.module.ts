import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CurrencyController } from './currency.controller';
import { CurrencyService } from './currency.service';
import { CurrencyAnalyzerService } from './currency-analyzer.service';
import { AiModule } from 'src/ai/ai.module';
import { PrismaService } from 'src/common/services/prisma.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    AiModule,
  ],
  controllers: [CurrencyController],
  providers: [CurrencyService, CurrencyAnalyzerService, PrismaService],
  exports: [CurrencyService, CurrencyAnalyzerService],
})
export class CurrencyModule {}
