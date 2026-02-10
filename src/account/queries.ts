import { Prisma } from '@db';

export const accountSelect = {
  id: true,
  accountNumber: true,
  iban: true,
  routingNumber: true,
  accountType: true,
  accountStatus: true,
  balance: true,
  currency: true,
  creditLimit: true,
  availableCredit: true,
  dueDate: true,
  nickname: true,
  createdAt: true,
  updatedAt: true,
  closedAt: true,
} satisfies Prisma.AccountSelect;

export type AccountSelect = Prisma.AccountGetPayload<{ select: typeof accountSelect }>;

export const accountWithTransactionsSelect = {
  ...accountSelect,
  transactions: {
    select: {
      id: true,
      type: true,
      status: true,
      category: true,
      amount: true,
      currency: true,
      description: true,
      merchant: true,
      reference: true,
      createdAt: true,
      completedAt: true,
    },
    orderBy: { createdAt: 'desc' as const },
    take: 5,
  },
} satisfies Prisma.AccountSelect;

export type AccountWithTransactionsSelect = Prisma.AccountGetPayload<{
  select: typeof accountWithTransactionsSelect;
}>;
