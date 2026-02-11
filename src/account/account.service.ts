import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/services/prisma.service';
import { AppLoggerService } from 'src/common/services/logger.service';
import { ApiResponse } from 'src/common/types';
import { throwError } from 'src/common/utils/helpers';
import { CreateAccountDto, UpdateAccountDto } from './dto/account.dto';
import { AccountSelect, accountSelect, accountWithTransactionsSelect } from './queries';
import { DashboardData, AccountStatement } from './types';
import { User, AccountType, AccountStatus, Prisma } from '@db';

@Injectable()
export class AccountService {
  private readonly logger = new AppLoggerService(AccountService.name);

  constructor(private readonly prismaService: PrismaService) {}

  private generateAccountNumber(accountType: AccountType): string {
    const prefix = accountType === AccountType.CURRENT ? '1' : accountType === AccountType.SAVINGS ? '2' : '3';
    const randomDigits = Math.floor(Math.random() * 1000000000)
      .toString()
      .padStart(9, '0');
    return prefix + randomDigits;
  }

  private generateIBAN(accountNumber: string): string {
    const countryCode = 'PK';
    const checkDigits = '36';
    const bankCode = 'DESI';
    return `${countryCode}${checkDigits}${bankCode}${accountNumber}`;
  }

  async createAccount(user: User, createAccountDto: CreateAccountDto): Promise<ApiResponse<AccountSelect>> {
    try {
      const { accountType, nickname, creditLimit } = createAccountDto;

      // Check if user already has an account
      const existingAccount = await this.prismaService.account.findFirst({
        where: {
          userId: user.id,
          closedAt: null,
        },
      });

      if (existingAccount) {
        throw throwError('You already have an account. Each user is allowed only one account.', HttpStatus.BAD_REQUEST);
      }

      if (accountType === AccountType.CREDIT_CARD && !creditLimit) {
        throw throwError('Credit limit is required for credit card accounts', HttpStatus.BAD_REQUEST);
      }

      const accountNumber = this.generateAccountNumber(accountType);
      const iban = this.generateIBAN(accountNumber);
      const routingNumber = '123456789';

      const accountData: Prisma.AccountCreateInput = {
        user: { connect: { id: user.id } },
        accountNumber,
        iban,
        routingNumber,
        accountType,
        nickname,
        balance: 0,
        currency: 'PKR',
      };

      if (accountType === AccountType.CREDIT_CARD && creditLimit) {
        accountData.creditLimit = creditLimit;
        accountData.availableCredit = creditLimit;
        accountData.dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }

      const account = await this.prismaService.account.create({
        data: accountData,
        select: accountSelect,
      });

      this.logger.log(`Account created: ${account.id} for user: ${user.id}`);

      return {
        message: 'Account created successfully',
        success: true,
        data: account,
      };
    } catch (err) {
      this.logger.error('Failed to create account', err.stack, AccountService.name);
      throw throwError(err.message || 'Failed to create account', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getAllUserAccounts(user: User, status?: AccountStatus): Promise<ApiResponse<AccountSelect[]>> {
    try {
      const where: Prisma.AccountWhereInput = {
        userId: user.id,
        closedAt: null,
      };

      if (status) {
        where.accountStatus = status;
      }

      const accounts = await this.prismaService.account.findMany({
        where,
        select: accountSelect,
        orderBy: { createdAt: 'desc' },
      });

      return {
        message: 'Accounts retrieved successfully',
        success: true,
        data: accounts,
      };
    } catch (err) {
      this.logger.error('Failed to retrieve accounts', err.stack, AccountService.name);
      throw throwError(err.message || 'Failed to retrieve accounts', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getAccountDashboard(user: User): Promise<ApiResponse<DashboardData>> {
    try {
      const accounts = await this.prismaService.account.findMany({
        where: {
          userId: user.id,
          closedAt: null,
        },
        select: accountWithTransactionsSelect,
        orderBy: { createdAt: 'desc' },
      });

      const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
      const activeAccounts = accounts.filter((acc) => acc.accountStatus === AccountStatus.ACTIVE).length;
      const totalCreditLimit = accounts
        .filter((acc) => acc.accountType === AccountType.CREDIT_CARD)
        .reduce((sum, acc) => sum + Number(acc.creditLimit || 0), 0);
      const totalAvailableCredit = accounts
        .filter((acc) => acc.accountType === AccountType.CREDIT_CARD)
        .reduce((sum, acc) => sum + Number(acc.availableCredit || 0), 0);

      const recentTransactions = accounts
        .flatMap((acc) => acc.transactions)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);

      const dashboardData: DashboardData = {
        accounts,
        summary: {
          totalBalance,
          totalAccounts: accounts.length,
          activeAccounts,
          totalCreditLimit,
          totalAvailableCredit,
        },
        recentTransactions,
      };

      return {
        message: 'Dashboard data retrieved successfully',
        success: true,
        data: dashboardData,
      };
    } catch (err) {
      this.logger.error('Failed to retrieve dashboard data', err.stack, AccountService.name);
      throw throwError(
        err.message || 'Failed to retrieve dashboard data',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAccountById(user: User, accountId: string): Promise<ApiResponse<AccountSelect>> {
    try {
      const account = await this.prismaService.account.findFirst({
        where: {
          id: accountId,
          userId: user.id,
        },
        select: accountSelect,
      });

      if (!account) {
        throw throwError('Account not found', HttpStatus.NOT_FOUND);
      }

      return {
        message: 'Account retrieved successfully',
        success: true,
        data: account,
      };
    } catch (err) {
      this.logger.error('Failed to retrieve account', err.stack, AccountService.name);
      throw throwError(err.message || 'Failed to retrieve account', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async updateAccount(
    user: User,
    accountId: string,
    updateAccountDto: UpdateAccountDto,
  ): Promise<ApiResponse<AccountSelect>> {
    try {
      const existingAccount = await this.prismaService.account.findFirst({
        where: {
          id: accountId,
          userId: user.id,
        },
      });

      if (!existingAccount) {
        throw throwError('Account not found', HttpStatus.NOT_FOUND);
      }

      if (existingAccount.closedAt) {
        throw throwError('Cannot update a closed account', HttpStatus.BAD_REQUEST);
      }

      const account = await this.prismaService.account.update({
        where: { id: accountId },
        data: updateAccountDto,
        select: accountSelect,
      });

      this.logger.log(`Account updated: ${accountId}`);

      return {
        message: 'Account updated successfully',
        success: true,
        data: account,
      };
    } catch (err) {
      this.logger.error('Failed to update account', err.stack, AccountService.name);
      throw throwError(err.message || 'Failed to update account', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async closeAccount(user: User, accountId: string): Promise<ApiResponse<void>> {
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

      if (account.closedAt) {
        throw throwError('Account is already closed', HttpStatus.BAD_REQUEST);
      }

      if (Number(account.balance) !== 0) {
        throw throwError('Cannot close account with non-zero balance', HttpStatus.BAD_REQUEST);
      }

      await this.prismaService.account.update({
        where: { id: accountId },
        data: {
          accountStatus: AccountStatus.CLOSED,
          closedAt: new Date(),
        },
      });

      this.logger.log(`Account closed: ${accountId}`);

      return {
        message: 'Account closed successfully',
        success: true,
        data: undefined,
      };
    } catch (err) {
      this.logger.error('Failed to close account', err.stack, AccountService.name);
      throw throwError(err.message || 'Failed to close account', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getAccountStatement(
    user: User,
    accountId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ApiResponse<AccountStatement>> {
    try {
      const account = await this.prismaService.account.findFirst({
        where: {
          id: accountId,
          userId: user.id,
        },
        select: accountSelect,
      });

      if (!account) {
        throw throwError('Account not found', HttpStatus.NOT_FOUND);
      }

      const transactions = await this.prismaService.transaction.findMany({
        where: {
          accountId,
          // createdAt: {
          //   gte: startDate,
          //   lte: endDate,
          // },
        },
        orderBy: { createdAt: 'asc' },
      });

      const openingBalance =
        transactions.length > 0
          ? Number(transactions[0].balanceAfter) - Number(transactions[0].amount)
          : Number(account.balance);
      const closingBalance = Number(account.balance);
      const totalDeposits = transactions
        .filter((t) => ['DEPOSIT', 'REFUND', 'INTEREST'].includes(t.type))
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const totalWithdrawals = transactions
        .filter((t) => ['WITHDRAWAL', 'PAYMENT', 'FEE', 'TRANSFER'].includes(t.type))
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const statement: AccountStatement = {
        account,
        transactions,
        period: { startDate, endDate },
        summary: {
          openingBalance,
          closingBalance,
          totalDeposits,
          totalWithdrawals,
          transactionCount: transactions.length,
        },
      };

      return {
        message: 'Account statement retrieved successfully',
        success: true,
        data: statement,
      };
    } catch (err) {
      this.logger.error('Failed to retrieve account statement', err.stack, AccountService.name);
      throw throwError(
        err.message || 'Failed to retrieve account statement',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
