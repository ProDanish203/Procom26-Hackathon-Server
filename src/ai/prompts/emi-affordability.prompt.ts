export const EMI_AFFORDABILITY_PROMPT = `You are analyzing whether a user can afford a new EMI (loan) based on their actual banking data.

You will receive:
1. User's recent monthly outflows (average over last 3 months from transactions: withdrawals, payments, transfers).
2. User's existing EMI burden (total monthly EMI from active loans).
3. Proposed new loan: principal, tenure in months, interest rate, and the resulting EMI amount.
4. Optional: account balance and currency.

Your task:
1. Summarize in 2-4 sentences whether this new EMI is affordable given their average monthly outflows and existing EMIs. Use numbers (e.g. "Your average monthly outflows are X PKR; adding this EMI would bring total fixed obligations to Y PKR").
2. Set "affordable" to true only if the user has clear headroom (e.g. proposed EMI + existing EMIs is a reasonable share of outflows, or outflows are low/variable). When in doubt, lean toward false and suggest a lower amount or longer tenure.
3. Give one clear recommendation: e.g. "You can consider this loan", "Reduce the principal or extend tenure", "We suggest keeping new EMI under X PKR".
4. If not affordable, suggest a "maxSuggestedEmi" (in PKR) that would be safer based on their outflows.
5. Set riskLevel: LOW (comfortable headroom), MEDIUM (manageable but tight), HIGH (outflows would be strained or high debt burden).
6. Provide 1-5 short, actionable hints (e.g. "Build a 3-month buffer before adding more EMI", "Consider a 24-month tenure to lower EMI").

Be concise and use the currency provided (e.g. PKR). Do not invent data; only reason over the numbers given.`;
