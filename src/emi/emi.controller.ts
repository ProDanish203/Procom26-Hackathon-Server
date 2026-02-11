import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiParam, ApiResponse as SwaggerResponse, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User, UserRole } from '@db';
import { ApiResponse } from 'src/common/types';
import { EmiService } from './emi.service';
import { CreateEmiPlanDto, GetEmiPlansQueryDto, PayEmiInstallmentDto } from './dto/emi.dto';
import { EmiPlanSelect } from './queries';
import { GetEmiPlansResponse, GetEmiScheduleResponse } from './types';

@Controller('emi')
@ApiTags('EMI')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class EmiController {
  constructor(private readonly emiService: EmiService) {}

  @Roles(...Object.values(UserRole))
  @Post('plans')
  @ApiOperation({ summary: 'Create EMI plan', description: 'Create a new EMI plan with schedule. Account will be debited for each installment when you pay.' })
  @SwaggerResponse({ status: 201, description: 'EMI plan created successfully' })
  @SwaggerResponse({ status: 400, description: 'Bad request - Invalid input or account not active' })
  @SwaggerResponse({ status: 404, description: 'Account not found' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  async createPlan(@CurrentUser() user: User, @Body() dto: CreateEmiPlanDto): Promise<ApiResponse<EmiPlanSelect>> {
    return this.emiService.createPlan(user, dto);
  }

  @Roles(...Object.values(UserRole))
  @Get('plans')
  @ApiOperation({ summary: 'List EMI plans', description: 'Get all EMI plans for the current user with optional status filter and pagination.' })
  @SwaggerResponse({ status: 200, description: 'EMI plans retrieved successfully' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  async getPlans(@CurrentUser() user: User, @Query() query: GetEmiPlansQueryDto): Promise<ApiResponse<GetEmiPlansResponse>> {
    return this.emiService.getPlans(user, query);
  }

  @Roles(...Object.values(UserRole))
  @Get('plans/:id')
  @ApiOperation({ summary: 'Get EMI plan by ID', description: 'Get details of a specific EMI plan.' })
  @ApiParam({ name: 'id', type: String, description: 'EMI plan ID (UUID)' })
  @SwaggerResponse({ status: 200, description: 'EMI plan retrieved successfully' })
  @SwaggerResponse({ status: 404, description: 'EMI plan not found' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  async getPlanById(@CurrentUser() user: User, @Param('id') id: string): Promise<ApiResponse<EmiPlanSelect>> {
    return this.emiService.getPlanById(user, id);
  }

  @Roles(...Object.values(UserRole))
  @Get('plans/:id/schedule')
  @ApiOperation({ summary: 'Get EMI schedule', description: 'Get full installment schedule for an EMI plan.' })
  @ApiParam({ name: 'id', type: String, description: 'EMI plan ID (UUID)' })
  @SwaggerResponse({ status: 200, description: 'EMI schedule retrieved successfully' })
  @SwaggerResponse({ status: 404, description: 'EMI plan not found' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  async getSchedule(@CurrentUser() user: User, @Param('id') id: string): Promise<ApiResponse<GetEmiScheduleResponse>> {
    return this.emiService.getSchedule(user, id);
  }

  @Roles(...Object.values(UserRole))
  @Post('installments/:installmentId/pay')
  @ApiOperation({ summary: 'Pay EMI installment', description: 'Pay a pending installment. Amount will be debited from the given account.' })
  @ApiParam({ name: 'installmentId', type: String, description: 'Installment ID (UUID)' })
  @SwaggerResponse({ status: 200, description: 'EMI installment paid successfully' })
  @SwaggerResponse({ status: 400, description: 'Bad request - Already paid or insufficient balance' })
  @SwaggerResponse({ status: 404, description: 'Installment not found' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  async payInstallment(
    @CurrentUser() user: User,
    @Param('installmentId') installmentId: string,
    @Body() dto: PayEmiInstallmentDto,
  ): Promise<ApiResponse<EmiPlanSelect>> {
    return this.emiService.payInstallment(user, installmentId, dto);
  }

  @Roles(...Object.values(UserRole))
  @Get('calculator')
  @ApiOperation({ summary: 'EMI calculator', description: 'Calculate EMI, total interest, and schedule preview without creating a plan. No auth required for calculation logic; protected for consistency.' })
  @SwaggerResponse({ status: 200, description: 'Calculation result' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  async calculator(
    @Query('principal') principal: string,
    @Query('tenureMonths') tenureMonths: string,
    @Query('interestRateAnnual') interestRateAnnual: string,
  ): Promise<
    ApiResponse<{
      emiAmount: number;
      totalInterest: number;
      totalAmount: number;
      schedulePreview: { installmentNumber: number; dueMonth: number; amount: number; principalComponent: number; interestComponent: number }[];
    }>
  > {
    const p = Number(principal);
    const t = Number(tenureMonths);
    const r = Number(interestRateAnnual);
    if (!Number.isFinite(p) || p <= 0 || !Number.isFinite(t) || t < 1 || !Number.isFinite(r) || r < 0) {
      throw new Error('Invalid query: principal, tenureMonths, and interestRateAnnual must be valid positive numbers.');
    }
    const result = this.emiService.calculate(p, r, t);
    return {
      message: 'EMI calculated successfully',
      success: true,
      data: result,
    };
  }
}
