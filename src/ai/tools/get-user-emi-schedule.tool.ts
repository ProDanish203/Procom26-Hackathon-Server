import { tool } from 'ai';
import { z } from 'zod';
import type { PrismaService } from 'src/common/services/prisma.service';

export function createGetUserEmiScheduleTool(prisma: PrismaService, boundUserId: string) {
  return tool({
    description:
      "Get the full installment schedule for a specific EMI plan. Use this when the user asks for 'EMI schedule', 'installment breakdown', or 'when are my EMIs due' for a loan.",
    inputSchema: z.object({
      emiPlanId: z.string().uuid().describe('The EMI plan ID (UUID) to fetch schedule for'),
    }),
    execute: async (input) => {
      const plan = await prisma.emiPlan.findFirst({
        where: { id: input.emiPlanId, userId: boundUserId },
        select: {
          id: true,
          productName: true,
          principal: true,
          emiAmount: true,
          currency: true,
          status: true,
          startDate: true,
          endDate: true,
          nextDueDate: true,
          tenureMonths: true,
        },
      });

      if (!plan) {
        return { error: 'EMI plan not found or does not belong to user.' };
      }

      const installments = await prisma.emiInstallment.findMany({
        where: { emiPlanId: input.emiPlanId },
        orderBy: { installmentNumber: 'asc' },
        select: {
          id: true,
          installmentNumber: true,
          dueDate: true,
          amount: true,
          principalComponent: true,
          interestComponent: true,
          status: true,
          paidAt: true,
        },
      });

      return {
        plan: {
          id: plan.id,
          productName: plan.productName,
          principal: Number(plan.principal),
          emiAmount: Number(plan.emiAmount),
          currency: plan.currency,
          status: plan.status,
          startDate: plan.startDate.toISOString().slice(0, 10),
          endDate: plan.endDate.toISOString().slice(0, 10),
          nextDueDate: plan.nextDueDate?.toISOString().slice(0, 10) ?? null,
          tenureMonths: plan.tenureMonths,
        },
        installments: installments.map((i) => ({
          id: i.id,
          installmentNumber: i.installmentNumber,
          dueDate: i.dueDate.toISOString().slice(0, 10),
          amount: Number(i.amount),
          principalComponent: Number(i.principalComponent),
          interestComponent: Number(i.interestComponent),
          status: i.status,
          paidAt: i.paidAt?.toISOString().slice(0, 10) ?? null,
        })),
      };
    },
  });
}
