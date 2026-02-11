import { z } from 'zod';

export const TransferRecommendationSchema = z.object({
  recommendation: z.enum(['transfer_now', 'wait']),
  reasoning: z.string(),
  potentialSavings: z.number(),
  riskLevel: z.enum(['low', 'medium', 'high']),
  suggestedTimeframe: z.string(),
  confidenceScore: z.number().min(0).max(1),
});

export type TransferRecommendation = z.infer<typeof TransferRecommendationSchema>;

export interface CurrencyStats {
  rates: Record<string, any>;
  current: number;
  avg30: number;
  min: number;
  max: number;
  volatility: number;
}

export interface CurrencyAnalysisResponse {
  currentRate: number;
  historicalData: CurrencyStats;
  recommendation: TransferRecommendation;
  estimatedAmount: number;
}
