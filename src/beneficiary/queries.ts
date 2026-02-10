import { Prisma } from '@db';

export const beneficiarySelect = {
  id: true,
  beneficiaryType: true,
  nickname: true,
  accountNumber: true,
  iban: true,
  bankName: true,
  accountTitle: true,
  consumerNumber: true,
  billerName: true,
  billerCategory: true,
  mobileNumber: true,
  mobileOperator: true,
  isActive: true,
  isFavorite: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BeneficiarySelect;

export type BeneficiarySelect = Prisma.BeneficiaryGetPayload<{ select: typeof beneficiarySelect }>;
