import { Prisma } from '@db';

export const paymentSelect = {
  id: true,
  paymentType: true,
  paymentStatus: true,
  amount: true,
  fee: true,
  totalAmount: true,
  currency: true,
  recipientName: true,
  recipientAccount: true,
  recipientIban: true,
  recipientBank: true,
  consumerNumber: true,
  billerName: true,
  billMonth: true,
  billAmount: true,
  dueDate: true,
  mobileNumber: true,
  mobileOperator: true,
  description: true,
  reference: true,
  transactionId: true,
  receiptUrl: true,
  failureReason: true,
  scheduledAt: true,
  processedAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PaymentSelect;

export type PaymentSelect = Prisma.PaymentGetPayload<{ select: typeof paymentSelect }>;
