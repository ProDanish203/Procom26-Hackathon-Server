import { Prisma } from '@db';

export const emiPlanSelect = {
  id: true,
  userId: true,
  accountId: true,
  productName: true,
  principal: true,
  interestRateAnnual: true,
  tenureMonths: true,
  emiAmount: true,
  currency: true,
  status: true,
  startDate: true,
  endDate: true,
  nextDueDate: true,
  totalInterest: true,
  createdAt: true,
  updatedAt: true,
  account: {
    select: {
      id: true,
      accountNumber: true,
      accountType: true,
      nickname: true,
    },
  },
} satisfies Prisma.EmiPlanSelect;

export type EmiPlanSelect = Prisma.EmiPlanGetPayload<{ select: typeof emiPlanSelect }>;

export const emiInstallmentSelect = {
  id: true,
  emiPlanId: true,
  installmentNumber: true,
  dueDate: true,
  amount: true,
  principalComponent: true,
  interestComponent: true,
  status: true,
  paidAt: true,
  paymentId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.EmiInstallmentSelect;

export type EmiInstallmentSelect = Prisma.EmiInstallmentGetPayload<{ select: typeof emiInstallmentSelect }>;
