import { z } from 'zod';

export const BankStatementAnalysisSchema = z.object({
  summary: z.string().describe('Brief factual summary of the statement period (2-4 sentences)'),
  feedback: z.string().describe('Constructive feedback on spending patterns and trends'),
  improvementHints: z.array(z.string()).min(3).max(7).describe('3-5 specific, actionable improvement hints'),
});

export type BankStatementAnalysis = z.infer<typeof BankStatementAnalysisSchema>;

export const EmiAffordabilityAnalysisSchema = z.object({
  summary: z.string().describe('2-4 sentence summary of whether the user can afford this EMI given their finances'),
  affordable: z.boolean().describe('True if the proposed EMI is considered affordable based on income/outflows and existing EMIs'),
  recommendation: z.string().describe('Actionable recommendation: proceed with caution, reduce amount/tenure, or go ahead'),
  maxSuggestedEmi: z.number().optional().describe('Optional suggested maximum EMI in PKR based on current outflows (if affordable is false)'),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']).describe('Risk level of taking this loan: LOW, MEDIUM, or HIGH'),
  hints: z.array(z.string()).min(1).max(5).describe('1-5 short tips for the user'),
});

export type EmiAffordabilityAnalysis = z.infer<typeof EmiAffordabilityAnalysisSchema>;
