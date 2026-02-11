import { tool } from 'ai';
import { z } from 'zod';
import type { PrismaService } from 'src/common/services/prisma.service';
import { EmiPlanStatus } from '@db';

export function createGetUserEmiPlansTool(prisma: PrismaService, boundUserId: string) {
  return tool({
    description:
      "List all EMI (Equated Monthly Installment) plans for the current user. Use this to answer questions about the user's loans, next EMI due dates, total monthly EMI burden, or remaining installments.",
    inputSchema: z.object({}),
    execute: async () => {
      const plans = await prisma.emiPlan.findMany({
        where: { userId: boundUserId },
        select: {
          id: true,
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
          _count: { select: { installments: true } },
        },
        orderBy: { nextDueDate: 'asc' },
      });

      const withPending = await Promise.all(
        plans.map(async (p) => {
          const pendingCount = await prisma.emiInstallment.count({
            where: { emiPlanId: p.id, status: 'PENDING' },
          });
          const paidCount = p._count.installments - pendingCount;
          return {
            id: p.id,
            productName: p.productName,
            principal: Number(p.principal),
            interestRateAnnual: Number(p.interestRateAnnual),
            tenureMonths: p.tenureMonths,
            emiAmount: Number(p.emiAmount),
            currency: p.currency,
            status: p.status,
            startDate: p.startDate.toISOString().slice(0, 10),
            endDate: p.endDate.toISOString().slice(0, 10),
            nextDueDate: p.nextDueDate?.toISOString().slice(0, 10) ?? null,
            totalInterest: Number(p.totalInterest),
            installmentsPaid: paidCount,
            installmentsPending: pendingCount,
            createdAt: p.createdAt.toISOString().slice(0, 10),
          };
        }),
      );

      const activePlans = withPending.filter((p) => p.status === EmiPlanStatus.ACTIVE || p.status === EmiPlanStatus.OVERDUE);
      const totalMonthlyEmi = activePlans.reduce((sum, p) => sum + p.emiAmount, 0);

      return {
        plans: withPending,
        summary: {
          totalPlans: withPending.length,
          activePlans: activePlans.length,
          totalMonthlyEmiBurden: Math.round(totalMonthlyEmi * 100) / 100,
          currency: plans[0]?.currency ?? 'PKR',
        },
      };
    },
  });
}
