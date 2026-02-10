import { tool } from 'ai';
import { z } from 'zod';
import type { PrismaService } from 'src/common/services/prisma.service';

export function createGetRecentTransactionsTool(prisma: PrismaService, boundUserId: string) {
  return tool({
    description:
      'Get the most recent transactions for the current user. Optionally filter by account. Use this to answer questions about recent activity, last payment, or spending.',
    inputSchema: z.object({
      accountId: z.string().uuid().optional().describe('Account ID (UUID). If omitted, uses the first active account.'),
      limit: z.number().min(1).max(50).default(10).describe('Number of transactions to return (default 10).'),
    }),
    execute: async ({ accountId, limit }) => {
      const account = accountId
        ? await prisma.account.findFirst({
            where: { id: accountId, userId: boundUserId, closedAt: null },
            select: { id: true },
          })
        : await prisma.account.findFirst({
            where: { userId: boundUserId, closedAt: null },
            select: { id: true },
          });

      if (!account) {
        return { error: 'Account not found or does not belong to user.' };
      }

      const transactions = await prisma.transaction.findMany({
        where: { accountId: account.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          type: true,
          status: true,
          category: true,
          amount: true,
          currency: true,
          description: true,
          merchant: true,
          createdAt: true,
          completedAt: true,
        },
      });

      return {
        accountId: account.id,
        transactions: transactions.map((t) => ({
          id: t.id,
          type: t.type,
          status: t.status,
          category: t.category,
          amount: Number(t.amount),
          currency: t.currency,
          description: t.description,
          merchant: t.merchant,
          createdAt: t.createdAt.toISOString(),
          completedAt: t.completedAt?.toISOString() ?? null,
        })),
      };
    },
  });
}
