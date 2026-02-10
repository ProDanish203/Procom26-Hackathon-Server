import { z } from 'zod';

export const BankStatementAnalysisSchema = z.object({
  summary: z.string().describe('Brief factual summary of the statement period (2-4 sentences)'),
  feedback: z.string().describe('Constructive feedback on spending patterns and trends'),
  improvementHints: z.array(z.string()).min(3).max(7).describe('3-5 specific, actionable improvement hints'),
});

export type BankStatementAnalysis = z.infer<typeof BankStatementAnalysisSchema>;
