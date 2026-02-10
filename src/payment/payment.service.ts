import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/services/prisma.service';
import { AppLoggerService } from 'src/common/services/logger.service';
import { ApiResponse } from 'src/common/types';
import { throwError } from 'src/common/utils/helpers';
import { IBFTTransferDto, RAASTTransferDto, BillPaymentDto, MobileRechargeDto, GetPaymentsQueryDto } from './dto/payment.dto';
import { PaymentSelect, paymentSelect } from './queries';
import { GetPaymentsResponse } from './types';
import { User, PaymentType, PaymentStatus, Prisma, AccountStatus } from '@db';

@Injectable()
export class PaymentService {
  private readonly logger = new AppLoggerService(PaymentService.name);

  constructor(private readonly prismaService: PrismaService) {}

  private generateReference(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `PAY-${timestamp}-${random}`;
  }

  private calculateFee(paymentType: PaymentType): number {
    const fees = {
      [PaymentType.INTERBANK_TRANSFER]: 0,
      [PaymentType.IBFT_TRANSFER]: 15,
      [PaymentType.RAAST_TRANSFER]: 0,
      [PaymentType.UTILITY_BILL]: 0,
      [PaymentType.TELECOM_BILL]: 0,
      [PaymentType.CREDIT_CARD_PAYMENT]: 0,
      [PaymentType.EDUCATION_FEE]: 0,
      [PaymentType.TAX_PAYMENT]: 0,
      [PaymentType.INSURANCE_PREMIUM]: 0,
      [PaymentType.MOBILE_RECHARGE]: 0,
      [PaymentType.OTHER]: 0,
    };
    return fees[paymentType] || 0;
  }

  async initiateIBFT(user: User, ibftDto: IBFTTransferDto): Promise<ApiResponse<PaymentSelect>> {
    try {
      const { accountId, beneficiaryId, recipientAccount, recipientBank, recipientName, amount, description } = ibftDto;

      const account = await this.prismaService.account.findFirst({
        where: { id: accountId, userId: user.id },
      });

      if (!account) throw throwError('Account not found', HttpStatus.NOT_FOUND);
      if (account.accountStatus !== AccountStatus.ACTIVE) throw throwError('Account is not active', HttpStatus.BAD_REQUEST);

      const fee = this.calculateFee(PaymentType.IBFT_TRANSFER);
      const totalAmount = amount + fee;

      if (Number(account.balance) < totalAmount) {
        throw throwError('Insufficient balance', HttpStatus.BAD_REQUEST);
      }

      const reference = this.generateReference();

      const payment = await this.prismaService.$transaction(async (prisma) => {
        await prisma.account.update({
          where: { id: accountId },
          data: { balance: Number(account.balance) - totalAmount },
        });

        return await prisma.payment.create({
          data: {
            userId: user.id,
            accountId,
            beneficiaryId,
            paymentType: PaymentType.IBFT_TRANSFER,
            paymentStatus: PaymentStatus.PROCESSING,
            amount,
            fee,
            totalAmount,
            currency: 'PKR',
            recipientName,
            recipientAccount,
            recipientBank,
            description,
            reference,
            processedAt: new Date(),
          },
          select: paymentSelect,
        });
      });

      this.logger.log(`IBFT transfer initiated: ${reference}`);

      return {
        message: 'IBFT transfer initiated successfully. Processing time: 1-2 business days',
        success: true,
        data: payment,
      };
    } catch (err) {
      this.logger.error('Failed to initiate IBFT', err.stack, PaymentService.name);
      throw throwError(err.message || 'Failed to initiate IBFT', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async initiateRaast(user: User, raastDto: RAASTTransferDto): Promise<ApiResponse<PaymentSelect>> {
    try {
      const { accountId, beneficiaryId, recipientIban, recipientName, amount, description } = raastDto;

      const account = await this.prismaService.account.findFirst({
        where: { id: accountId, userId: user.id },
      });

      if (!account) throw throwError('Account not found', HttpStatus.NOT_FOUND);
      if (account.accountStatus !== AccountStatus.ACTIVE) throw throwError('Account is not active', HttpStatus.BAD_REQUEST);

      const fee = this.calculateFee(PaymentType.RAAST_TRANSFER);
      const totalAmount = amount + fee;

      if (Number(account.balance) < totalAmount) {
        throw throwError('Insufficient balance', HttpStatus.BAD_REQUEST);
      }

      const reference = this.generateReference();

      const payment = await this.prismaService.$transaction(async (prisma) => {
        await prisma.account.update({
          where: { id: accountId },
          data: { balance: Number(account.balance) - totalAmount },
        });

        return await prisma.payment.create({
          data: {
            userId: user.id,
            accountId,
            beneficiaryId,
            paymentType: PaymentType.RAAST_TRANSFER,
            paymentStatus: PaymentStatus.COMPLETED,
            amount,
            fee,
            totalAmount,
            currency: 'PKR',
            recipientName,
            recipientIban,
            description,
            reference,
            processedAt: new Date(),
            completedAt: new Date(),
          },
          select: paymentSelect,
        });
      });

      this.logger.log(`RAAST transfer completed: ${reference}`);

      return {
        message: 'RAAST transfer completed successfully',
        success: true,
        data: payment,
      };
    } catch (err) {
      this.logger.error('Failed to initiate RAAST', err.stack, PaymentService.name);
      throw throwError(err.message || 'Failed to initiate RAAST', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async payBill(user: User, billDto: BillPaymentDto): Promise<ApiResponse<PaymentSelect>> {
    try {
      const { accountId, beneficiaryId, billerName, consumerNumber, amount, billMonth, dueDate } = billDto;

      const account = await this.prismaService.account.findFirst({
        where: { id: accountId, userId: user.id },
      });

      if (!account) throw throwError('Account not found', HttpStatus.NOT_FOUND);
      if (account.accountStatus !== AccountStatus.ACTIVE) throw throwError('Account is not active', HttpStatus.BAD_REQUEST);

      const fee = this.calculateFee(PaymentType.UTILITY_BILL);
      const totalAmount = amount + fee;

      if (Number(account.balance) < totalAmount) {
        throw throwError('Insufficient balance', HttpStatus.BAD_REQUEST);
      }

      const reference = this.generateReference();

      const payment = await this.prismaService.$transaction(async (prisma) => {
        await prisma.account.update({
          where: { id: accountId },
          data: { balance: Number(account.balance) - totalAmount },
        });

        return await prisma.payment.create({
          data: {
            userId: user.id,
            accountId,
            beneficiaryId,
            paymentType: PaymentType.UTILITY_BILL,
            paymentStatus: PaymentStatus.COMPLETED,
            amount,
            fee,
            totalAmount,
            currency: 'PKR',
            recipientName: billerName,
            billerName,
            consumerNumber,
            billAmount: amount,
            billMonth,
            dueDate: dueDate ? new Date(dueDate) : undefined,
            description: `Bill payment for ${billerName}`,
            reference,
            processedAt: new Date(),
            completedAt: new Date(),
          },
          select: paymentSelect,
        });
      });

      this.logger.log(`Bill payment completed: ${reference}`);

      return {
        message: 'Bill payment completed successfully',
        success: true,
        data: payment,
      };
    } catch (err) {
      this.logger.error('Failed to pay bill', err.stack, PaymentService.name);
      throw throwError(err.message || 'Failed to pay bill', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async mobileRecharge(user: User, rechargeDto: MobileRechargeDto): Promise<ApiResponse<PaymentSelect>> {
    try {
      const { accountId, mobileNumber, mobileOperator, amount } = rechargeDto;

      const account = await this.prismaService.account.findFirst({
        where: { id: accountId, userId: user.id },
      });

      if (!account) throw throwError('Account not found', HttpStatus.NOT_FOUND);
      if (account.accountStatus !== AccountStatus.ACTIVE) throw throwError('Account is not active', HttpStatus.BAD_REQUEST);

      const fee = this.calculateFee(PaymentType.MOBILE_RECHARGE);
      const totalAmount = amount + fee;

      if (Number(account.balance) < totalAmount) {
        throw throwError('Insufficient balance', HttpStatus.BAD_REQUEST);
      }

      const reference = this.generateReference();

      const payment = await this.prismaService.$transaction(async (prisma) => {
        await prisma.account.update({
          where: { id: accountId },
          data: { balance: Number(account.balance) - totalAmount },
        });

        return await prisma.payment.create({
          data: {
            userId: user.id,
            accountId,
            paymentType: PaymentType.MOBILE_RECHARGE,
            paymentStatus: PaymentStatus.COMPLETED,
            amount,
            fee,
            totalAmount,
            currency: 'PKR',
            recipientName: mobileNumber,
            mobileNumber,
            mobileOperator,
            description: `${mobileOperator} recharge for ${mobileNumber}`,
            reference,
            processedAt: new Date(),
            completedAt: new Date(),
          },
          select: paymentSelect,
        });
      });

      this.logger.log(`Mobile recharge completed: ${reference}`);

      return {
        message: 'Mobile recharge completed successfully',
        success: true,
        data: payment,
      };
    } catch (err) {
      this.logger.error('Failed to recharge mobile', err.stack, PaymentService.name);
      throw throwError(err.message || 'Failed to recharge mobile', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getPaymentHistory(user: User, query: GetPaymentsQueryDto): Promise<ApiResponse<GetPaymentsResponse>> {
    try {
      const { page = 1, limit = 20, type, status, startDate, endDate, search } = query;

      const where: Prisma.PaymentWhereInput = {
        userId: user.id,
      };

      if (type) where.paymentType = type;
      if (status) where.paymentStatus = status;

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      if (search) {
        where.OR = [
          { description: { contains: search, mode: 'insensitive' } },
          { recipientName: { contains: search, mode: 'insensitive' } },
          { reference: { contains: search, mode: 'insensitive' } },
          { billerName: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [payments, totalCount] = await Promise.all([
        this.prismaService.payment.findMany({
          where,
          select: paymentSelect,
          orderBy: { createdAt: 'desc' },
          skip: (Number(page) - 1) * Number(limit),
          take: Number(limit),
        }),
        this.prismaService.payment.count({ where }),
      ]);

      const totalPages = Math.ceil(totalCount / Number(limit));

      return {
        message: 'Payment history retrieved successfully',
        success: true,
        data: {
          payments,
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
      this.logger.error('Failed to retrieve payment history', err.stack, PaymentService.name);
      throw throwError(
        err.message || 'Failed to retrieve payment history',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getPaymentById(user: User, paymentId: string): Promise<ApiResponse<PaymentSelect>> {
    try {
      const payment = await this.prismaService.payment.findFirst({
        where: {
          id: paymentId,
          userId: user.id,
        },
        select: paymentSelect,
      });

      if (!payment) {
        throw throwError('Payment not found', HttpStatus.NOT_FOUND);
      }

      return {
        message: 'Payment retrieved successfully',
        success: true,
        data: payment,
      };
    } catch (err) {
      this.logger.error('Failed to retrieve payment', err.stack, PaymentService.name);
      throw throwError(err.message || 'Failed to retrieve payment', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
