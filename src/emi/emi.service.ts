import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/services/prisma.service';
import { AppLoggerService } from 'src/common/services/logger.service';
import { ApiResponse } from 'src/common/types';
import { throwError } from 'src/common/utils/helpers';
import { CreateEmiPlanDto, GetEmiPlansQueryDto, PayEmiInstallmentDto } from './dto/emi.dto';
import { EmiPlanSelect, emiPlanSelect, emiInstallmentSelect } from './queries';
import { GetEmiPlansResponse, GetEmiScheduleResponse } from './types';
import { User, Prisma, EmiPlanStatus, EmiInstallmentStatus, AccountStatus, PaymentType, PaymentStatus, TransactionType, TransactionStatus, TransactionCategory } from '@db';

@Injectable()
export class EmiService {
  private readonly logger = new AppLoggerService(EmiService.name);

  constructor(private readonly prismaService: PrismaService) {}

  /** EMI = P * r * (1+r)^n / ((1+r)^n - 1); r = annual rate/12/100 */
  calculateEmi(principal: number, interestRateAnnual: number, tenureMonths: number): number {
    if (tenureMonths <= 0) return 0;
    const r = interestRateAnnual / 100 / 12;
    if (r === 0) return Math.round((principal / tenureMonths) * 100) / 100;
    const factor = Math.pow(1 + r, tenureMonths);
    const emi = (principal * r * factor) / (factor - 1);
    return Math.round(emi * 100) / 100;
  }

  /** Build schedule: [{ dueDate, amount, principalComponent, interestComponent }] */
  buildSchedule(
    principal: number,
    interestRateAnnual: number,
    tenureMonths: number,
    firstDueDate: Date,
  ): { dueDate: Date; amount: number; principalComponent: number; interestComponent: number }[] {
    const emi = this.calculateEmi(principal, interestRateAnnual, tenureMonths);
    const r = interestRateAnnual / 100 / 12;
    const schedule: { dueDate: Date; amount: number; principalComponent: number; interestComponent: number }[] = [];
    let outstanding = principal;
    let due = new Date(firstDueDate);

    for (let i = 0; i < tenureMonths; i++) {
      const interest = Math.round(outstanding * r * 100) / 100;
      let principalComponent = Math.round((emi - interest) * 100) / 100;
      if (i === tenureMonths - 1) {
        principalComponent = Math.round(outstanding * 100) / 100;
      }
      const amount = Math.round((principalComponent + interest) * 100) / 100;
      schedule.push({ dueDate: new Date(due), amount, principalComponent, interestComponent: interest });
      outstanding -= principalComponent;
      due.setMonth(due.getMonth() + 1);
    }
    return schedule;
  }

  private generatePaymentReference(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `EMI-${timestamp}-${random}`;
  }

  private generateTransactionReference(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `TXN-${timestamp}-${random}`;
  }

  async createPlan(user: User, dto: CreateEmiPlanDto): Promise<ApiResponse<EmiPlanSelect>> {
    try {
      const account = await this.prismaService.account.findFirst({
        where: { id: dto.accountId, userId: user.id },
      });
      if (!account) throw throwError('Account not found', HttpStatus.NOT_FOUND);
      if (account.accountStatus !== AccountStatus.ACTIVE) throw throwError('Account is not active', HttpStatus.BAD_REQUEST);

      const principal = dto.principal;
      const tenureMonths = dto.tenureMonths;
      const rate = dto.interestRateAnnual;
      const emiAmount = this.calculateEmi(principal, rate, tenureMonths);
      const schedule = this.buildSchedule(principal, rate, tenureMonths, dto.startDate ? new Date(dto.startDate) : this.getDefaultFirstDueDate());
      const totalInterest = schedule.reduce((sum, row) => sum + row.interestComponent, 0);
      const startDate = schedule[0].dueDate;
      const endDate = schedule[schedule.length - 1].dueDate;
      const nextDueDate = schedule[0].dueDate;

      const plan = await this.prismaService.$transaction(async (prisma) => {
        const created = await prisma.emiPlan.create({
          data: {
            userId: user.id,
            accountId: dto.accountId,
            productName: dto.productName ?? null,
            principal: new Prisma.Decimal(principal),
            interestRateAnnual: new Prisma.Decimal(rate),
            tenureMonths,
            emiAmount: new Prisma.Decimal(emiAmount),
            currency: account.currency,
            status: EmiPlanStatus.ACTIVE,
            startDate,
            endDate,
            nextDueDate,
            totalInterest: new Prisma.Decimal(Math.round(totalInterest * 100) / 100),
          },
        });
        await prisma.emiInstallment.createMany({
          data: schedule.map((row, i) => ({
            emiPlanId: created.id,
            installmentNumber: i + 1,
            dueDate: row.dueDate,
            amount: new Prisma.Decimal(row.amount),
            principalComponent: new Prisma.Decimal(row.principalComponent),
            interestComponent: new Prisma.Decimal(row.interestComponent),
            status: EmiInstallmentStatus.PENDING,
          })),
        });
        return prisma.emiPlan.findUniqueOrThrow({
          where: { id: created.id },
          select: emiPlanSelect,
        });
      });

      this.logger.log(`EMI plan created: ${plan.id} for user ${user.id}`);
      return {
        message: 'EMI plan created successfully',
        success: true,
        data: plan,
      };
    } catch (err) {
      this.logger.error('Failed to create EMI plan', err.stack, EmiService.name);
      throw throwError(err.message || 'Failed to create EMI plan', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private getDefaultFirstDueDate(): Date {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  async getPlans(user: User, query: GetEmiPlansQueryDto): Promise<ApiResponse<GetEmiPlansResponse>> {
    try {
      const { page = 1, limit = 20, status } = query;
      const where: Prisma.EmiPlanWhereInput = { userId: user.id };
      if (status) where.status = status;

      const [plans, totalCount] = await Promise.all([
        this.prismaService.emiPlan.findMany({
          where,
          select: emiPlanSelect,
          orderBy: { nextDueDate: 'asc' },
          skip: (Number(page) - 1) * Number(limit),
          take: Number(limit),
        }),
        this.prismaService.emiPlan.count({ where }),
      ]);
      const totalPages = Math.ceil(totalCount / Number(limit));
      return {
        message: 'EMI plans retrieved successfully',
        success: true,
        data: {
          plans,
          pagination: {
            totalCount,
            totalPages,
            page: Number(page),
            limit: Number(limit),
            hasNextPage: Number(page) < totalPages,
            hasPrevPage: Number(page) > 1,
          },
        },
      };
    } catch (err) {
      this.logger.error('Failed to retrieve EMI plans', err.stack, EmiService.name);
      throw throwError(err.message || 'Failed to retrieve EMI plans', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getPlanById(user: User, planId: string): Promise<ApiResponse<EmiPlanSelect>> {
    try {
      const plan = await this.prismaService.emiPlan.findFirst({
        where: { id: planId, userId: user.id },
        select: emiPlanSelect,
      });
      if (!plan) throw throwError('EMI plan not found', HttpStatus.NOT_FOUND);
      return {
        message: 'EMI plan retrieved successfully',
        success: true,
        data: plan,
      };
    } catch (err) {
      this.logger.error('Failed to retrieve EMI plan', err.stack, EmiService.name);
      throw throwError(err.message || 'Failed to retrieve EMI plan', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getSchedule(user: User, planId: string): Promise<ApiResponse<GetEmiScheduleResponse>> {
    try {
      const plan = await this.prismaService.emiPlan.findFirst({
        where: { id: planId, userId: user.id },
        select: emiPlanSelect,
      });
      if (!plan) throw throwError('EMI plan not found', HttpStatus.NOT_FOUND);
      const installments = await this.prismaService.emiInstallment.findMany({
        where: { emiPlanId: planId },
        select: emiInstallmentSelect,
        orderBy: { installmentNumber: 'asc' },
      });
      return {
        message: 'EMI schedule retrieved successfully',
        success: true,
        data: { plan, installments },
      };
    } catch (err) {
      this.logger.error('Failed to retrieve EMI schedule', err.stack, EmiService.name);
      throw throwError(err.message || 'Failed to retrieve EMI schedule', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async payInstallment(user: User, installmentId: string, dto: PayEmiInstallmentDto): Promise<ApiResponse<EmiPlanSelect>> {
    try {
      const installment = await this.prismaService.emiInstallment.findFirst({
        where: { id: installmentId },
        include: { emiPlan: true },
      });
      if (!installment || installment.emiPlan.userId !== user.id) throw throwError('Installment not found', HttpStatus.NOT_FOUND);
      if (installment.status === EmiInstallmentStatus.PAID) throw throwError('Installment already paid', HttpStatus.BAD_REQUEST);
      if (dto.accountId !== installment.emiPlan.accountId) throw throwError('Account does not match EMI plan', HttpStatus.BAD_REQUEST);

      const account = await this.prismaService.account.findFirst({
        where: { id: dto.accountId, userId: user.id },
      });
      if (!account) throw throwError('Account not found', HttpStatus.NOT_FOUND);
      if (account.accountStatus !== AccountStatus.ACTIVE) throw throwError('Account is not active', HttpStatus.BAD_REQUEST);

      const amount = Number(installment.amount);
      const currentBalance = Number(account.balance);
      if (currentBalance < amount) throw throwError('Insufficient balance', HttpStatus.BAD_REQUEST);

      const paymentRef = this.generatePaymentReference();
      const txnRef = this.generateTransactionReference();
      const newBalance = new Prisma.Decimal(currentBalance - amount);
      const productName = installment.emiPlan.productName || 'EMI';

      const updated = await this.prismaService.$transaction(async (prisma) => {
        await prisma.account.update({
          where: { id: dto.accountId },
          data: { balance: newBalance },
        });
        const payment = await prisma.payment.create({
          data: {
            userId: user.id,
            accountId: dto.accountId,
            paymentType: PaymentType.OTHER,
            paymentStatus: PaymentStatus.COMPLETED,
            amount: new Prisma.Decimal(amount),
            fee: new Prisma.Decimal(0),
            totalAmount: new Prisma.Decimal(amount),
            currency: account.currency,
            recipientName: `EMI Installment #${installment.installmentNumber} - ${productName}`,
            description: `EMI payment - ${productName} (Installment ${installment.installmentNumber}/${installment.emiPlan.tenureMonths})`,
            reference: paymentRef,
            processedAt: new Date(),
            completedAt: new Date(),
          },
        });
        await prisma.transaction.create({
          data: {
            accountId: dto.accountId,
            type: TransactionType.PAYMENT,
            status: TransactionStatus.COMPLETED,
            category: TransactionCategory.OTHER,
            amount: new Prisma.Decimal(-amount),
            currency: account.currency,
            balanceAfter: newBalance,
            description: `EMI - ${productName} (Installment ${installment.installmentNumber})`,
            reference: txnRef,
            completedAt: new Date(),
          },
        });
        await prisma.emiInstallment.update({
          where: { id: installmentId },
          data: { status: EmiInstallmentStatus.PAID, paidAt: new Date(), paymentId: payment.id },
        });

        const nextPending = await prisma.emiInstallment.findFirst({
          where: { emiPlanId: installment.emiPlanId, status: EmiInstallmentStatus.PENDING },
          orderBy: { installmentNumber: 'asc' },
        });
        const nextDue = nextPending?.dueDate ?? null;
        const allPaid = !nextPending;
        await prisma.emiPlan.update({
          where: { id: installment.emiPlanId },
          data: {
            nextDueDate: nextDue,
            status: allPaid ? EmiPlanStatus.COMPLETED : EmiPlanStatus.ACTIVE,
          },
        });

        return prisma.emiPlan.findUniqueOrThrow({
          where: { id: installment.emiPlanId },
          select: emiPlanSelect,
        });
      });

      this.logger.log(`EMI installment paid: ${installmentId} for plan ${installment.emiPlanId}`);
      return {
        message: 'EMI installment paid successfully',
        success: true,
        data: updated,
      };
    } catch (err) {
      this.logger.error('Failed to pay EMI installment', err.stack, EmiService.name);
      throw throwError(err.message || 'Failed to pay EMI installment', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /** Calculator only: no DB write. Used by API and AI. */
  calculate(
    principal: number,
    interestRateAnnual: number,
    tenureMonths: number,
  ): { emiAmount: number; totalInterest: number; totalAmount: number; schedulePreview: { installmentNumber: number; dueMonth: number; amount: number; principalComponent: number; interestComponent: number }[] } {
    const emiAmount = this.calculateEmi(principal, interestRateAnnual, tenureMonths);
    const firstDue = this.getDefaultFirstDueDate();
    const schedule = this.buildSchedule(principal, interestRateAnnual, tenureMonths, firstDue);
    const totalInterest = schedule.reduce((s, r) => s + r.interestComponent, 0);
    const schedulePreview = schedule.map((r, i) => ({
      installmentNumber: i + 1,
      dueMonth: i + 1,
      amount: r.amount,
      principalComponent: r.principalComponent,
      interestComponent: r.interestComponent,
    }));
    return {
      emiAmount,
      totalInterest: Math.round(totalInterest * 100) / 100,
      totalAmount: Math.round((principal + totalInterest) * 100) / 100,
      schedulePreview,
    };
  }
}
