import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiProperty,
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
import { PaymentService } from './payment.service';
import { IBFTTransferDto, RAASTTransferDto, BillPaymentDto, MobileRechargeDto, GetPaymentsQueryDto } from './dto/payment.dto';
import { PaymentSelect } from './queries';
import { GetPaymentsResponse } from './types';
import { RedisService } from 'src/common/services/redis.service';

@Controller('payment')
@ApiTags('Payment & Transfers')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class PaymentController {
  private readonly CACHE_TTL = 180;

  constructor(
    private readonly paymentService: PaymentService,
    private readonly redisService: RedisService,
  ) {}

  @Roles(...Object.values(UserRole))
  @Post('ibft')
  @ApiProperty({ title: 'IBFT Transfer', description: 'Initiate Interbank Fund Transfer to other banks', type: IBFTTransferDto })
  @SwaggerResponse({ status: 201, description: 'IBFT transfer initiated. Processing time: 1-2 business days. Fee: PKR 15' })
  @SwaggerResponse({ status: 400, description: 'Bad request - Insufficient balance or inactive account' })
  @SwaggerResponse({ status: 404, description: 'Account not found' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  async initiateIBFT(
    @CurrentUser() user: User,
    @Body() ibftDto: IBFTTransferDto,
  ): Promise<ApiResponse<PaymentSelect>> {
    const response = await this.paymentService.initiateIBFT(user, ibftDto);
    await this.redisService.delete(`payment:${user.id}:history`);
    return response;
  }

  @Roles(...Object.values(UserRole))
  @Post('raast')
  @ApiProperty({ title: 'RAAST Transfer', description: 'Instant transfer via RAAST payment system', type: RAASTTransferDto })
  @SwaggerResponse({ status: 201, description: 'RAAST transfer completed instantly. Fee: PKR 0' })
  @SwaggerResponse({ status: 400, description: 'Bad request - Insufficient balance, invalid IBAN, or inactive account' })
  @SwaggerResponse({ status: 404, description: 'Account not found' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  async initiateRaast(
    @CurrentUser() user: User,
    @Body() raastDto: RAASTTransferDto,
  ): Promise<ApiResponse<PaymentSelect>> {
    const response = await this.paymentService.initiateRaast(user, raastDto);
    await this.redisService.delete(`payment:${user.id}:history`);
    return response;
  }

  @Roles(...Object.values(UserRole))
  @Post('bill')
  @ApiProperty({ title: 'Pay Bill', description: 'Pay utility, telecom, or other bills', type: BillPaymentDto })
  @SwaggerResponse({ status: 201, description: 'Bill payment completed successfully. Fee: PKR 0' })
  @SwaggerResponse({ status: 400, description: 'Bad request - Insufficient balance or inactive account' })
  @SwaggerResponse({ status: 404, description: 'Account not found' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  async payBill(
    @CurrentUser() user: User,
    @Body() billDto: BillPaymentDto,
  ): Promise<ApiResponse<PaymentSelect>> {
    const response = await this.paymentService.payBill(user, billDto);
    await this.redisService.delete(`payment:${user.id}:history`);
    return response;
  }

  @Roles(...Object.values(UserRole))
  @Post('recharge')
  @ApiProperty({ title: 'Mobile Recharge', description: 'Recharge mobile prepaid balance', type: MobileRechargeDto })
  @SwaggerResponse({ status: 201, description: 'Mobile recharge completed successfully. Fee: PKR 0' })
  @SwaggerResponse({ status: 400, description: 'Bad request - Insufficient balance, invalid mobile number, or inactive account' })
  @SwaggerResponse({ status: 404, description: 'Account not found' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  async mobileRecharge(
    @CurrentUser() user: User,
    @Body() rechargeDto: MobileRechargeDto,
  ): Promise<ApiResponse<PaymentSelect>> {
    const response = await this.paymentService.mobileRecharge(user, rechargeDto);
    await this.redisService.delete(`payment:${user.id}:history`);
    return response;
  }

  @Roles(...Object.values(UserRole))
  @Get()
  @ApiProperty({ title: 'Get Payment History', description: 'Get all payments with filtering and pagination' })
  @SwaggerResponse({ status: 200, description: 'Payment history retrieved successfully' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  async getPaymentHistory(
    @CurrentUser() user: User,
    @Query() query: GetPaymentsQueryDto,
  ): Promise<ApiResponse<GetPaymentsResponse>> {
    return this.paymentService.getPaymentHistory(user, query);
  }

  @Roles(...Object.values(UserRole))
  @Get(':id')
  @ApiProperty({ title: 'Get Payment Details', description: 'Get details of a specific payment' })
  @ApiParam({ name: 'id', type: String, description: 'Payment ID (UUID)' })
  @SwaggerResponse({ status: 200, description: 'Payment retrieved successfully' })
  @SwaggerResponse({ status: 404, description: 'Payment not found or does not belong to user' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  async getPaymentById(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<ApiResponse<PaymentSelect>> {
    return this.paymentService.getPaymentById(user, id);
  }
}
