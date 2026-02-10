import { Prisma } from '@db';

export const cardSelect = {
  id: true,
  userId: true,
  accountId: true,
  cardType: true,
  status: true,
  lastFourDigits: true,
  expiryMonth: true,
  expiryYear: true,
  spendingLimitDaily: true,
  spendingLimitMonthly: true,
  pinChangedAt: true,
  rewardsPoints: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CardSelect;

export type CardSelect = Prisma.CardGetPayload<{ select: typeof cardSelect }>;

export const cardWithAccountSelect = {
  ...cardSelect,
  account: {
    select: {
      id: true,
      accountNumber: true,
      accountType: true,
      nickname: true,
      balance: true,
      currency: true,
      creditLimit: true,
      availableCredit: true,
      dueDate: true,
      minimumPaymentDue: true,
    },
  },
} satisfies Prisma.CardSelect;

export type CardWithAccountSelect = Prisma.CardGetPayload<{ select: typeof cardWithAccountSelect }>;
