import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/services/prisma.service';
import { AppLoggerService } from 'src/common/services/logger.service';
import { ApiResponse } from 'src/common/types';
import { throwError } from 'src/common/utils/helpers';
import { TransferDto, GetTransactionsQueryDto, DepositDto } from './dto/transaction.dto';
import { TransactionSelect, transactionSelect } from './queries';
import { GetTransactionsResponse } from './types';
import { User, Prisma, TransactionType, TransactionStatus, TransactionCategory, AccountStatus } from '@db';

@Injectable()
export class TransactionService {
  private readonly logger = new AppLoggerService(TransactionService.name);

  constructor(private readonly prismaService: PrismaService) {}

  private generateReference(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `TXN-${timestamp}-${random}`;
  }

  async getAccountTransactions(
    user: User,
    accountId: string,
    query: GetTransactionsQueryDto,
  ): Promise<ApiResponse<GetTransactionsResponse>> {
    try {
      const account = await this.prismaService.account.findFirst({
        where: {
          id: accountId,
          userId: user.id,
        },
      });

      if (!account) {
        throw throwError('Account not found', HttpStatus.NOT_FOUND);
      }

      const { page = 1, limit = 20, type, status, category, startDate, endDate, search } = query;

      const where: Prisma.TransactionWhereInput = {
        accountId,
      };

      if (type) where.type = type;
      if (status) where.status = status;
      if (category) where.category = category;

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      if (search) {
        where.OR = [
          { description: { contains: search, mode: 'insensitive' } },
          { merchant: { contains: search, mode: 'insensitive' } },
          { reference: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [transactions, totalCount] = await Promise.all([
        this.prismaService.transaction.findMany({
          where,
          select: transactionSelect,
          orderBy: { createdAt: 'desc' },
          skip: (Number(page) - 1) * Number(limit),
          take: Number(limit),
        }),
        this.prismaService.transaction.count({ where }),
      ]);

      const totalPages = Math.ceil(totalCount / Number(limit));

      return {
        message: 'Transactions retrieved successfully',
        success: true,
        data: {
          transactions,
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
      this.logger.error('Failed to retrieve transactions', err.stack, TransactionService.name);
      throw throwError(
        err.message || 'Failed to retrieve transactions',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getTransactionById(user: User, transactionId: string): Promise<ApiResponse<TransactionSelect>> {
    try {
      const transaction = await this.prismaService.transaction.findFirst({
        where: {
          id: transactionId,
          account: {
            userId: user.id,
          },
        },
        select: transactionSelect,
      });

      if (!transaction) {
        throw throwError('Transaction not found', HttpStatus.NOT_FOUND);
      }

      return {
        message: 'Transaction retrieved successfully',
        success: true,
        data: transaction,
      };
    } catch (err) {
      this.logger.error('Failed to retrieve transaction', err.stack, TransactionService.name);
      throw throwError(
        err.message || 'Failed to retrieve transaction',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createTransfer(user: User, transferDto: TransferDto): Promise<ApiResponse<TransactionSelect>> {
    try {
      const { fromAccountId, toAccountId, amount, description } = transferDto;

      if (fromAccountId === toAccountId) {
        throw throwError('Cannot transfer to the same account', HttpStatus.BAD_REQUEST);
      }

      const [fromAccount, toAccount] = await Promise.all([
        this.prismaService.account.findFirst({
          where: { id: fromAccountId, userId: user.id },
        }),
        this.prismaService.account.findFirst({
          where: { id: toAccountId, userId: user.id },
        }),
      ]);

      if (!fromAccount) {
        throw throwError('Source account not found', HttpStatus.NOT_FOUND);
      }

      if (!toAccount) {
        throw throwError('Destination account not found', HttpStatus.NOT_FOUND);
      }

      if (fromAccount.accountStatus !== AccountStatus.ACTIVE) {
        throw throwError('Source account is not active', HttpStatus.BAD_REQUEST);
      }

      if (toAccount.accountStatus !== AccountStatus.ACTIVE) {
        throw throwError('Destination account is not active', HttpStatus.BAD_REQUEST);
      }

      if (Number(fromAccount.balance) < amount) {
        throw throwError('Insufficient balance', HttpStatus.BAD_REQUEST);
      }

      const reference = this.generateReference();

      const result = await this.prismaService.$transaction(async (prisma) => {
        const currentFromBalance = Number(fromAccount.balance);
        const currentToBalance = Number(toAccount.balance);
        const newFromBalance = new Prisma.Decimal(currentFromBalance - amount);
        const newToBalance = new Prisma.Decimal(currentToBalance + amount);

        await prisma.account.update({
          where: { id: fromAccountId },
          data: { balance: newFromBalance },
        });

        await prisma.account.update({
          where: { id: toAccountId },
          data: { balance: newToBalance },
        });

        const debitTransaction = await prisma.transaction.create({
          data: {
            accountId: fromAccountId,
            type: TransactionType.TRANSFER,
            status: TransactionStatus.COMPLETED,
            category: TransactionCategory.TRANSFER,
            amount: new Prisma.Decimal(-amount),
            currency: fromAccount.currency,
            balanceAfter: newFromBalance,
            description: `Transfer to ${toAccount.accountNumber} - ${description}`,
            reference,
            toAccountId,
            fromAccountId,
            completedAt: new Date(),
          },
          select: transactionSelect,
        });

        await prisma.transaction.create({
          data: {
            accountId: toAccountId,
            type: TransactionType.TRANSFER,
            status: TransactionStatus.COMPLETED,
            category: TransactionCategory.TRANSFER,
            amount: new Prisma.Decimal(amount),
            currency: toAccount.currency,
            balanceAfter: newToBalance,
            description: `Transfer from ${fromAccount.accountNumber} - ${description}`,
            reference,
            toAccountId,
            fromAccountId,
            completedAt: new Date(),
          },
        });

        return debitTransaction;
      });

      this.logger.log(`Transfer completed: ${reference} from ${fromAccountId} to ${toAccountId}`);

      return {
        message: 'Transfer completed successfully',
        success: true,
        data: result,
      };
    } catch (err) {
      this.logger.error('Failed to create transfer', err.stack, TransactionService.name);
      throw throwError(err.message || 'Failed to create transfer', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async depositCash(user: User, depositDto: DepositDto): Promise<ApiResponse<TransactionSelect>> {
    try {
      const { accountId, amount, description, location } = depositDto;

      const account = await this.prismaService.account.findFirst({
        where: { id: accountId, userId: user.id },
      });

      if (!account) {
        throw throwError('Account not found', HttpStatus.NOT_FOUND);
      }

      if (account.accountStatus !== AccountStatus.ACTIVE) {
        throw throwError('Account is not active', HttpStatus.BAD_REQUEST);
      }

      const reference = this.generateReference();
      const currentBalance = Number(account.balance);
      const newBalance = new Prisma.Decimal(currentBalance + amount);

      const transaction = await this.prismaService.$transaction(async (prisma) => {
        await prisma.account.update({
          where: { id: accountId },
          data: { balance: newBalance },
        });

        return await prisma.transaction.create({
          data: {
            accountId,
            type: TransactionType.DEPOSIT,
            status: TransactionStatus.COMPLETED,
            category: TransactionCategory.OTHER,
            amount: new Prisma.Decimal(amount),
            currency: account.currency,
            balanceAfter: newBalance,
            description: location ? `${description} - ${location}` : description,
            reference,
            completedAt: new Date(),
            metadata: location ? { location } : undefined,
          },
          select: transactionSelect,
        });
      });

      this.logger.log(`Cash deposit completed: ${reference} for account: ${accountId}`);

      return {
        message: 'Cash deposit completed successfully',
        success: true,
        data: transaction,
      };
    } catch (err) {
      this.logger.error('Failed to deposit cash', err.stack, TransactionService.name);
      throw throwError(err.message || 'Failed to deposit cash', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
