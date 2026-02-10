import { tool } from 'ai';
import { z } from 'zod';
import type { PrismaService } from 'src/common/services/prisma.service';
import { accountSelect } from 'src/account/queries';

export function createListUserAccountsTool(prisma: PrismaService, boundUserId: string) {
  return tool({
    description:
      'List all bank accounts belonging to the current user. Use this to show account overview, balances, or let the user choose an account.',
    inputSchema: z.object({}),
    execute: async () => {
      const accounts = await prisma.account.findMany({
        where: { userId: boundUserId, closedAt: null },
        select: accountSelect,
        orderBy: { createdAt: 'asc' },
      });

      return {
        accounts: accounts.map((a) => ({
          id: a.id,
          accountNumber: a.accountNumber,
          accountType: a.accountType,
          accountStatus: a.accountStatus,
          balance: Number(a.balance),
          currency: a.currency,
          nickname: a.nickname,
          ...(a.creditLimit != null && { creditLimit: Number(a.creditLimit) }),
          ...(a.availableCredit != null && { availableCredit: Number(a.availableCredit) }),
          ...(a.dueDate != null && { dueDate: a.dueDate.toISOString().slice(0, 10) }),
        })),
      };
    },
  });
}
