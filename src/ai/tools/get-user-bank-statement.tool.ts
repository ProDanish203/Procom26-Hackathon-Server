import { tool } from 'ai';
import { z } from 'zod';
import type { PrismaService } from 'src/common/services/prisma.service';
import { accountSelect } from 'src/account/queries';

const statementInputSchema = z.object({
  accountId: z.string().uuid().describe('The account ID (UUID) to fetch statement for'),
  startDate: z.string().describe('Start date in YYYY-MM-DD format'),
  endDate: z.string().describe('End date in YYYY-MM-DD format'),
});

const statementInputSchemaWithUserId = statementInputSchema.extend({
  userId: z.string().uuid().describe('The user ID (UUID) who owns the account'),
});

export function createGetUserBankStatementTool(prisma: PrismaService, boundUserId?: string) {
  const userId = boundUserId;
  return tool({
    description:
      'Get the bank statement for a user account within a date range. Use this to fetch transaction history and account summary from the database.',
    inputSchema: userId ? statementInputSchema : statementInputSchemaWithUserId,
    execute: async (input) => {
      const { accountId, startDate, endDate } = input;
      const resolvedUserId = userId ?? (input as z.infer<typeof statementInputSchemaWithUserId>).userId;
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return { error: 'Invalid date format. Use YYYY-MM-DD.' };
      }

      const account = await prisma.account.findFirst({
        where: { id: accountId, userId: resolvedUserId },
        select: accountSelect,
      });

      if (!account) {
        return { error: 'Account not found or does not belong to user.' };
      }

      const transactions = await prisma.transaction.findMany({
        where: {
          accountId,
          createdAt: { gte: start, lte: end },
        },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          type: true,
          status: true,
          category: true,
          amount: true,
          balanceAfter: true,
          currency: true,
          description: true,
          merchant: true,
          reference: true,
          createdAt: true,
          completedAt: true,
        },
      });

      const openingBalance =
        transactions.length > 0
          ? Number(transactions[0].balanceAfter) - Number(transactions[0].amount)
          : Number(account.balance);
      const closingBalance = Number(account.balance);
      const totalDeposits = transactions
        .filter((t) => ['DEPOSIT', 'REFUND', 'INTEREST'].includes(t.type))
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const totalWithdrawals = transactions
        .filter((t) => ['WITHDRAWAL', 'PAYMENT', 'FEE', 'TRANSFER'].includes(t.type))
        .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

      return {
        account: {
          id: account.id,
          accountNumber: account.accountNumber,
          accountType: account.accountType,
          accountStatus: account.accountStatus,
          balance: Number(account.balance),
          currency: account.currency,
        },
        period: { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) },
        summary: {
          openingBalance,
          closingBalance,
          totalDeposits,
          totalWithdrawals,
          transactionCount: transactions.length,
        },
        transactions: transactions.map((t) => ({
          id: t.id,
          type: t.type,
          category: t.category,
          amount: Number(t.amount),
          currency: t.currency,
          description: t.description,
          merchant: t.merchant,
          createdAt: t.createdAt.toISOString(),
        })),
      };
    },
  });
}
