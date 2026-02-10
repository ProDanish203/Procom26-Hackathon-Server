import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
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
import { User, UserRole, AccountStatus } from '@db';
import { ApiResponse } from 'src/common/types';
import { AccountService } from './account.service';
import { CreateAccountDto, UpdateAccountDto } from './dto/account.dto';
import { AccountSelect } from './queries';
import { DashboardData, AccountStatement } from './types';

@Controller('account')
@ApiTags('Account Management')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Roles(...Object.values(UserRole))
  @Post()
  @ApiProperty({ title: 'Create Account', description: 'Create a new bank account', type: CreateAccountDto })
  @SwaggerResponse({ status: 201, description: 'Account created successfully' })
  @SwaggerResponse({ status: 400, description: 'Bad request - User already has an account or invalid data' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async createAccount(
    @CurrentUser() user: User,
    @Body() createAccountDto: CreateAccountDto,
  ): Promise<ApiResponse<AccountSelect>> {
    return this.accountService.createAccount(user, createAccountDto);
  }

  @Roles(...Object.values(UserRole))
  @Get()
  @ApiProperty({ title: 'Get All User Accounts', description: 'Get all accounts for the current user' })
  @ApiQuery({ name: 'status', enum: AccountStatus, required: false, description: 'Filter by account status' })
  @SwaggerResponse({ status: 200, description: 'Accounts retrieved successfully' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async getAllUserAccounts(
    @CurrentUser() user: User,
    @Query('status') status?: AccountStatus,
  ): Promise<ApiResponse<AccountSelect[]>> {
    return this.accountService.getAllUserAccounts(user, status);
  }

  @Roles(...Object.values(UserRole))
  @Get('dashboard')
  @ApiProperty({
    title: 'Get Account Dashboard',
    description: 'Get dashboard with all accounts, summary, and recent transactions',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully',
    schema: {
      example: {
        message: 'Dashboard data retrieved successfully',
        success: true,
        data: {
          accounts: [],
          summary: {
            totalBalance: 20000,
            totalAccounts: 1,
            activeAccounts: 1,
            totalCreditLimit: 0,
            totalAvailableCredit: 0,
          },
          recentTransactions: [],
        },
      },
    },
  })
  @SwaggerResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async getAccountDashboard(@CurrentUser() user: User): Promise<ApiResponse<DashboardData>> {
    return this.accountService.getAccountDashboard(user);
  }

  @Roles(...Object.values(UserRole))
  @Get(':id')
  @ApiProperty({ title: 'Get Account Details', description: 'Get details of a specific account' })
  @ApiParam({ name: 'id', type: String, description: 'Account ID (UUID)' })
  @SwaggerResponse({ status: 200, description: 'Account retrieved successfully' })
  @SwaggerResponse({ status: 404, description: 'Account not found or does not belong to user' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async getAccountById(@CurrentUser() user: User, @Param('id') id: string): Promise<ApiResponse<AccountSelect>> {
    return this.accountService.getAccountById(user, id);
  }

  @Roles(...Object.values(UserRole))
  @Put(':id')
  @ApiProperty({
    title: 'Update Account',
    description: 'Update account details (nickname or status)',
    type: UpdateAccountDto,
  })
  @ApiParam({ name: 'id', type: String, description: 'Account ID (UUID)' })
  @SwaggerResponse({ status: 200, description: 'Account updated successfully' })
  @SwaggerResponse({ status: 400, description: 'Bad request - Cannot update closed account' })
  @SwaggerResponse({ status: 404, description: 'Account not found or does not belong to user' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async updateAccount(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() updateAccountDto: UpdateAccountDto,
  ): Promise<ApiResponse<AccountSelect>> {
    return this.accountService.updateAccount(user, id, updateAccountDto);
  }

  @Roles(...Object.values(UserRole))
  @Delete(':id')
  @ApiProperty({
    title: 'Close Account',
    description: 'Close a bank account (soft delete). Account balance must be zero.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Account ID (UUID)' })
  @SwaggerResponse({ status: 200, description: 'Account closed successfully' })
  @SwaggerResponse({ status: 400, description: 'Bad request - Account already closed or has non-zero balance' })
  @SwaggerResponse({ status: 404, description: 'Account not found or does not belong to user' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async closeAccount(@CurrentUser() user: User, @Param('id') id: string): Promise<ApiResponse<void>> {
    return this.accountService.closeAccount(user, id);
  }

  @Roles(...Object.values(UserRole))
  @Get(':id/statement')
  @ApiProperty({ title: 'Get Account Statement', description: 'Get account statement for a specific date range' })
  @ApiParam({ name: 'id', type: String, description: 'Account ID (UUID)' })
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
    description: 'Statement retrieved successfully',
    schema: {
      example: {
        message: 'Account statement retrieved successfully',
        success: true,
        data: {
          account: {},
          transactions: [],
          period: { startDate: '2026-01-01', endDate: '2026-01-31' },
          summary: {
            openingBalance: 5000,
            closingBalance: 4500,
            totalDeposits: 1000,
            totalWithdrawals: 1500,
            transactionCount: 10,
          },
        },
      },
    },
  })
  @SwaggerResponse({ status: 400, description: 'Bad request - Invalid date format' })
  @SwaggerResponse({ status: 404, description: 'Account not found or does not belong to user' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async getAccountStatement(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<ApiResponse<AccountStatement>> {
    if (!startDate || !endDate) {
      throw new Error('startDate and endDate are required');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date format. Use YYYY-MM-DD format');
    }

    return this.accountService.getAccountStatement(user, id, start, end);
  }
}
