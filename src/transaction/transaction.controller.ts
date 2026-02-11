import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiProperty,
  ApiQuery,
  ApiTags,
  ApiParam,
  ApiResponse as SwaggerResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User, UserRole } from '@db';
import { ApiResponse } from 'src/common/types';
import { TransactionService } from './transaction.service';
import { TransferDto, GetTransactionsQueryDto, DepositDto, GetBankStatementQueryDto } from './dto/transaction.dto';
import { TransactionSelect } from './queries';
import { GetTransactionsResponse, BankStatement } from './types';

@Controller('transaction')
@ApiTags('Transaction Management')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Roles(...Object.values(UserRole))
  @Get('account/:accountId/bank-statement')
  @ApiProperty({
    title: 'Get Bank Statement',
    description: 'Get a full bank statement for an account within a date range for export',
  })
  @ApiParam({ name: 'accountId', type: String, description: 'Account ID (UUID)' })
  @ApiQuery({
    name: 'startDate',
    type: String,
    required: true,
    example: '2026-01-01',
    description: 'Start date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    type: String,
    required: true,
    example: '2026-01-31',
    description: 'End date (YYYY-MM-DD)',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Bank statement retrieved successfully',
    schema: {
      example: {
        message: 'Bank statement retrieved successfully',
        success: true,
        data: {
          statementId: 'BST-1707598800-ABC123',
          generatedAt: '2026-02-10T12:00:00.000Z',
          account: {
            id: 'uuid',
            accountNumber: '1234567890',
            accountType: 'SAVINGS',
            accountStatus: 'ACTIVE',
            balance: 25000,
            currency: 'PKR',
            nickname: 'Main',
          },
          period: { startDate: '2026-01-01', endDate: '2026-01-31' },
          summary: {
            openingBalance: 5000,
            closingBalance: 25000,
            totalDeposits: 22000,
            totalWithdrawals: 2000,
            transactionCount: 15,
          },
          transactions: [],
        },
      },
    },
  })
  @SwaggerResponse({ status: 400, description: 'Invalid date format or start date after end date' })
  @SwaggerResponse({ status: 404, description: 'Account not found or does not belong to user' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async getBankStatement(
    @CurrentUser() user: User,
    @Param('accountId') accountId: string,
    @Query() query: GetBankStatementQueryDto,
  ): Promise<ApiResponse<BankStatement>> {
    return this.transactionService.getBankStatement(user, accountId, query);
  }

  @Roles(...Object.values(UserRole))
  @Get('account/:accountId')
  @ApiProperty({
    title: 'Get Account Transactions',
    description: 'Get all transactions for a specific account with filtering and pagination',
  })
  @ApiParam({ name: 'accountId', type: String, description: 'Account ID (UUID)' })
  @ApiQuery({ name: 'page', type: Number, required: false, example: 1, description: 'Page number' })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 20, description: 'Items per page' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by transaction type' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by transaction status' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by transaction category' })
  @ApiQuery({
    name: 'startDate',
    type: String,
    required: false,
    example: '2026-01-01',
    description: 'Start date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    type: String,
    required: false,
    example: '2026-01-31',
    description: 'End date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'search',
    type: String,
    required: false,
    description: 'Search in description, merchant, or reference',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Transactions retrieved successfully',
    schema: {
      example: {
        message: 'Transactions retrieved successfully',
        success: true,
        data: {
          transactions: [],
          pagination: {
            totalCount: 50,
            totalPages: 3,
            page: 1,
            limit: 20,
            hasNextPage: true,
            hasPrevPage: false,
          },
        },
      },
    },
  })
  @SwaggerResponse({ status: 404, description: 'Account not found or does not belong to user' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async getAccountTransactions(
    @CurrentUser() user: User,
    @Param('accountId') accountId: string,
    @Query() query: GetTransactionsQueryDto,
  ): Promise<ApiResponse<GetTransactionsResponse>> {
    return this.transactionService.getAccountTransactions(user, accountId, query);
  }

  @Roles(...Object.values(UserRole))
  @Get(':id')
  @ApiProperty({ title: 'Get Transaction Details', description: 'Get details of a specific transaction' })
  @ApiParam({ name: 'id', type: String, description: 'Transaction ID (UUID)' })
  @SwaggerResponse({ status: 200, description: 'Transaction retrieved successfully' })
  @SwaggerResponse({ status: 404, description: 'Transaction not found or does not belong to user' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async getTransactionById(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<ApiResponse<TransactionSelect>> {
    return this.transactionService.getTransactionById(user, id);
  }

  @Roles(...Object.values(UserRole))
  @Post('deposit')
  @ApiProperty({
    title: 'Deposit Cash',
    description: 'Deposit cash into account (simulates branch/ATM deposit)',
    type: DepositDto,
  })
  @SwaggerResponse({
    status: 201,
    description: 'Cash deposit completed successfully',
    schema: {
      example: {
        message: 'Cash deposit completed successfully',
        success: true,
        data: {
          id: 'uuid',
          accountId: 'uuid',
          type: 'DEPOSIT',
          status: 'COMPLETED',
          category: 'OTHER',
          amount: 5000,
          currency: 'PKR',
          balanceAfter: 25000,
          description: 'Cash deposit at branch - Main Branch Karachi',
          reference: 'TXN-1707598800-ABC123',
          completedAt: '2026-02-10T...',
          createdAt: '2026-02-10T...',
        },
      },
    },
  })
  @SwaggerResponse({ status: 400, description: 'Bad request - Inactive account' })
  @SwaggerResponse({ status: 404, description: 'Account not found' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async depositCash(
    @CurrentUser() user: User,
    @Body() depositDto: DepositDto,
  ): Promise<ApiResponse<TransactionSelect>> {
    return this.transactionService.depositCash(user, depositDto);
  }

  @Roles(...Object.values(UserRole))
  @Post('transfer')
  @ApiProperty({
    title: 'Create Transfer',
    description: 'Transfer money between two accounts owned by the user',
    type: TransferDto,
  })
  @SwaggerResponse({
    status: 201,
    description: 'Transfer completed successfully',
    schema: {
      example: {
        message: 'Transfer completed successfully',
        success: true,
        data: {
          id: 'uuid',
          accountId: 'uuid',
          type: 'TRANSFER',
          status: 'COMPLETED',
          category: 'TRANSFER',
          amount: -100.5,
          currency: 'PKR',
          balanceAfter: 4899.5,
          description: 'Transfer to 2234567891 - Savings deposit',
          reference: 'TXN-1707598800-ABC123',
          toAccountId: 'uuid',
          fromAccountId: 'uuid',
          completedAt: '2026-02-10T...',
          createdAt: '2026-02-10T...',
        },
      },
    },
  })
  @SwaggerResponse({
    status: 400,
    description: 'Bad request - Insufficient balance, same account, or inactive account',
  })
  @SwaggerResponse({ status: 404, description: 'Source or destination account not found' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async createTransfer(
    @CurrentUser() user: User,
    @Body() transferDto: TransferDto,
  ): Promise<ApiResponse<TransactionSelect>> {
    return this.transactionService.createTransfer(user, transferDto);
  }
}
