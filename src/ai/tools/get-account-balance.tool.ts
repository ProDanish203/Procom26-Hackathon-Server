import { tool } from 'ai';
import { z } from 'zod';
import type { PrismaService } from 'src/common/services/prisma.service';

export function createGetAccountBalanceTool(prisma: PrismaService, boundUserId: string) {
  return tool({
    description:
      'Get current balance for one account or a summary of all accounts (total balance per account). Use when the user asks "how much do I have?", "what is my balance?", or "check my account balance".',
    inputSchema: z.object({
      accountId: z
        .string()
        .uuid()
        .optional()
        .describe('Account ID (UUID). If omitted, returns balance for all active accounts.'),
    }),
    execute: async ({ accountId }) => {
      if (accountId) {
        const account = await prisma.account.findFirst({
          where: { id: accountId, userId: boundUserId, closedAt: null },
          select: { id: true, accountNumber: true, accountType: true, balance: true, currency: true, nickname: true },
        });
        if (!account) return { error: 'Account not found or does not belong to user.' };
        return {
          account: {
            id: account.id,
            accountNumber: account.accountNumber,
            accountType: account.accountType,
            balance: Number(account.balance),
            currency: account.currency,
            nickname: account.nickname,
          },
        };
      }

      const accounts = await prisma.account.findMany({
        where: { userId: boundUserId, closedAt: null },
        select: { id: true, accountNumber: true, accountType: true, balance: true, currency: true, nickname: true },
        orderBy: { createdAt: 'asc' },
      });

      const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0);

      return {
        accounts: accounts.map((a) => ({
          id: a.id,
          accountNumber: a.accountNumber,
          accountType: a.accountType,
          balance: Number(a.balance),
          currency: a.currency,
          nickname: a.nickname,
        })),
        totalBalance,
        currency: accounts[0]?.currency ?? 'PKR',
      };
    },
  });
}
