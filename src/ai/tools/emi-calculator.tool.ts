import { tool } from 'ai';
import { z } from 'zod';

/** EMI = P * r * (1+r)^n / ((1+r)^n - 1); r = annual rate/12/100 */
function calculateEmi(principal: number, interestRateAnnual: number, tenureMonths: number): number {
  if (tenureMonths <= 0) return 0;
  const r = interestRateAnnual / 100 / 12;
  if (r === 0) return Math.round((principal / tenureMonths) * 100) / 100;
  const factor = Math.pow(1 + r, tenureMonths);
  const emi = (principal * r * factor) / (factor - 1);
  return Math.round(emi * 100) / 100;
}

export function createEmiCalculatorTool() {
  return tool({
    description:
      'Calculate EMI (Equated Monthly Installment) for a loan. Use this when the user asks "what would my EMI be", "how much per month for X amount", or "EMI for principal X at Y% for Z months". Returns monthly EMI, total interest, and total amount payable.',
    inputSchema: z.object({
      principal: z.number().positive().describe('Loan principal amount (e.g. 500000)'),
      interestRateAnnual: z.number().min(0).describe('Annual interest rate in percent (e.g. 12.5 for 12.5%)'),
      tenureMonths: z.number().int().positive().describe('Tenure in months (e.g. 12 for one year)'),
    }),
    execute: async (input) => {
      const { principal, interestRateAnnual, tenureMonths } = input;
      const emiAmount = calculateEmi(principal, interestRateAnnual, tenureMonths);
      const totalAmount = emiAmount * tenureMonths;
      const totalInterest = totalAmount - principal;
      return {
        principal,
        interestRateAnnual,
        tenureMonths,
        emiAmount,
        totalInterest: Math.round(totalInterest * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        currency: 'PKR',
      };
    },
  });
}
