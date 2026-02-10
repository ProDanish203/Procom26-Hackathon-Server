import { Prisma } from '@db';

export const transactionSelect = {
  id: true,
  accountId: true,
  type: true,
  status: true,
  category: true,
  amount: true,
  currency: true,
  balanceAfter: true,
  description: true,
  merchant: true,
  reference: true,
  toAccountId: true,
  fromAccountId: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
} satisfies Prisma.TransactionSelect;

export type TransactionSelect = Prisma.TransactionGetPayload<{ select: typeof transactionSelect }>;

export const transactionWithAccountSelect = {
  ...transactionSelect,
  account: {
    select: {
      id: true,
      accountNumber: true,
      accountType: true,
      nickname: true,
    },
  },
} satisfies Prisma.TransactionSelect;

export type TransactionWithAccountSelect = Prisma.TransactionGetPayload<{
  select: typeof transactionWithAccountSelect;
}>;
