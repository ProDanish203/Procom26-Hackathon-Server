export const BANK_STATEMENT_ANALYZER_PROMPT = `Analyze the following bank statement data for the user.

You will receive:
1. Account summary (type, balance, currency)
2. Statement period (start and end date)
3. Statement summary (opening balance, closing balance, total deposits, total withdrawals, transaction count)
4. List of transactions (type, amount, category, description, merchant, date)

Your task:
1. Write a brief, factual summary of the period (2–4 sentences).
2. Provide constructive feedback on spending patterns, savings, or notable trends (e.g. high dining spend, regular deposits).
3. Give 3–5 specific, actionable improvement hints (e.g. "Consider setting a monthly dining budget", "You had several small transfers; batching could reduce fees").

Be specific and reference actual numbers/categories from the data. Keep tone supportive and non-judgmental.`;
