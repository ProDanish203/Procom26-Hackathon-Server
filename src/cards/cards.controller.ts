import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
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
import { User, UserRole, CardType } from '@db';
import { ApiResponse } from 'src/common/types';
import { CardsService } from './cards.service';
import {
  UpdateCardStatusDto,
  SetSpendingLimitsDto,
  GetCardStatementQueryDto,
  GetCardPaymentHistoryQueryDto,
} from './dto/cards.dto';
import {
  GetCardsResponse,
  CardMaskedDto,
  CreditCardSummaryResponse,
  GetCardStatementResponse,
  GetCardPaymentHistoryResponse,
} from './types';
import { CardSelect } from './queries';
import { RedisService } from 'src/common/services/redis.service';

@Controller('cards')
@ApiTags('Cards Management')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class CardsController {
  private readonly CACHE_TTL = 180;

  constructor(
    private readonly cardsService: CardsService,
    private readonly redisService: RedisService,
  ) {}

  private getCacheKey(userId: string, prefix: string, ...params: (string | number | undefined)[]): string {
    const keyParts = params.filter((p) => p !== undefined && p !== null && p !== '');
    return `cards:${userId}:${prefix}:${keyParts.join(':')}`;
  }

  private async invalidateCardCache(userId: string, cardId?: string): Promise<void> {
    await this.redisService.delete(`cards:${userId}:all`);
    if (cardId) {
      await this.redisService.delete(this.getCacheKey(userId, 'detail', cardId));
      await this.redisService.delete(this.getCacheKey(userId, 'summary', cardId));
      await this.redisService.delete(this.getCacheKey(userId, 'payment-history', cardId));
      await this.redisService.delete(this.getCacheKey(userId, 'statement', cardId));
    }
  }

  @Roles(...Object.values(UserRole))
  @Get()
  @ApiProperty({
    title: 'Get All Cards',
    description: 'Get all cards for the current user with masked details. Optional filter by card type.',
  })
  @ApiQuery({ name: 'cardType', enum: CardType, required: false, description: 'Filter by DEBIT or CREDIT' })
  @SwaggerResponse({
    status: 200,
    description: 'Cards retrieved successfully',
    schema: {
      example: {
        message: 'Cards retrieved successfully',
        success: true,
        data: {
          cards: [
            {
              id: 'uuid',
              cardType: 'DEBIT',
              status: 'ACTIVE',
              maskedNumber: '**** **** **** 1234',
              lastFourDigits: '1234',
              expiryMonth: 12,
              expiryYear: 2028,
              rewardsPoints: 0,
            },
          ],
          totalCount: 1,
        },
      },
    },
  })
  @SwaggerResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async getAllCards(
    @CurrentUser() user: User,
    @Query('cardType') cardType?: CardType,
  ): Promise<ApiResponse<GetCardsResponse>> {
    const cacheKey = this.getCacheKey(user.id, 'all', cardType);

    const cached = await this.redisService.get<ApiResponse<GetCardsResponse>>(cacheKey);
    if (cached) return cached;

    const response = await this.cardsService.getAllCards(user, cardType);
    await this.redisService.set(cacheKey, response, this.CACHE_TTL);

    return response;
  }

  @Roles(...Object.values(UserRole))
  @Get(':id/statement')
  @ApiProperty({
    title: 'Card Statement',
    description: 'Get transaction statement for this card with optional date range and pagination',
  })
  @ApiParam({ name: 'id', type: String, description: 'Card ID (UUID)' })
  @ApiQuery({ name: 'page', type: Number, required: false, example: 1 })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 20 })
  @ApiQuery({ name: 'startDate', type: String, required: false, example: '2026-01-01' })
  @ApiQuery({ name: 'endDate', type: String, required: false, example: '2026-01-31' })
  @SwaggerResponse({ status: 200, description: 'Card statement retrieved successfully' })
  @SwaggerResponse({ status: 404, description: 'Card not found or does not belong to user' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async getCardStatement(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Query() query: GetCardStatementQueryDto,
  ): Promise<ApiResponse<GetCardStatementResponse>> {
    const { page, limit, startDate, endDate } = query;
    const cacheKey = this.getCacheKey(user.id, 'statement', id, String(page), String(limit), startDate, endDate);

    const cached = await this.redisService.get<ApiResponse<GetCardStatementResponse>>(cacheKey);
    if (cached) return cached;

    const response = await this.cardsService.getCardStatement(user, id, query);
    await this.redisService.set(cacheKey, response, this.CACHE_TTL);

    return response;
  }

  @Roles(...Object.values(UserRole))
  @Get(':id/summary')
  @ApiProperty({
    title: 'Credit Card Summary',
    description:
      'Get credit card summary: current balance, available credit, minimum payment due, rewards/points (credit cards only)',
  })
  @ApiParam({ name: 'id', type: String, description: 'Card ID (UUID)' })
  @SwaggerResponse({
    status: 200,
    description: 'Credit card summary retrieved successfully',
    schema: {
      example: {
        message: 'Credit card summary retrieved successfully',
        success: true,
        data: {
          cardId: 'uuid',
          accountId: 'uuid',
          currentBalance: 25000,
          availableCredit: 475000,
          creditLimit: 500000,
          minimumPaymentDue: 5000,
          dueDate: '2026-02-15',
          rewardsPoints: 1250,
          currency: 'PKR',
        },
      },
    },
  })
  @SwaggerResponse({ status: 400, description: 'Summary is only available for credit cards' })
  @SwaggerResponse({ status: 404, description: 'Card not found or does not belong to user' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async getCreditCardSummary(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<ApiResponse<CreditCardSummaryResponse>> {
    const cacheKey = this.getCacheKey(user.id, 'summary', id);

    const cached = await this.redisService.get<ApiResponse<CreditCardSummaryResponse>>(cacheKey);
    if (cached) return cached;

    const response = await this.cardsService.getCreditCardSummary(user, id);
    await this.redisService.set(cacheKey, response, this.CACHE_TTL);

    return response;
  }

  @Roles(...Object.values(UserRole))
  @Get(':id/payment-history')
  @ApiProperty({
    title: 'Credit Card Payment History',
    description: 'Get payment history for this credit card (payments made toward the card)',
  })
  @ApiParam({ name: 'id', type: String, description: 'Card ID (UUID)' })
  @ApiQuery({ name: 'page', type: Number, required: false, example: 1 })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 20 })
  @ApiQuery({ name: 'startDate', type: String, required: false })
  @ApiQuery({ name: 'endDate', type: String, required: false })
  @SwaggerResponse({ status: 200, description: 'Payment history retrieved successfully' })
  @SwaggerResponse({ status: 400, description: 'Payment history is only available for credit cards' })
  @SwaggerResponse({ status: 404, description: 'Card not found or does not belong to user' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async getCreditCardPaymentHistory(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Query() query: GetCardPaymentHistoryQueryDto,
  ): Promise<ApiResponse<GetCardPaymentHistoryResponse>> {
    const { page, limit, startDate, endDate } = query;
    const cacheKey = this.getCacheKey(
      user.id,
      'payment-history',
      id,
      String(page),
      String(limit),
      startDate,
      endDate,
    );

    const cached =
      await this.redisService.get<ApiResponse<GetCardPaymentHistoryResponse>>(cacheKey);
    if (cached) return cached;

    const response = await this.cardsService.getCreditCardPaymentHistory(user, id, query);
    await this.redisService.set(cacheKey, response, this.CACHE_TTL);

    return response;
  }

  @Roles(...Object.values(UserRole))
  @Get(':id')
  @ApiProperty({
    title: 'Get Card Details',
    description: 'Get masked details of a specific card (last 4 digits, expiry, limits, status)',
  })
  @ApiParam({ name: 'id', type: String, description: 'Card ID (UUID)' })
  @SwaggerResponse({ status: 200, description: 'Card retrieved successfully' })
  @SwaggerResponse({ status: 404, description: 'Card not found or does not belong to user' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async getCardById(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<ApiResponse<CardMaskedDto>> {
    const cacheKey = this.getCacheKey(user.id, 'detail', id);

    const cached = await this.redisService.get<ApiResponse<CardMaskedDto>>(cacheKey);
    if (cached) return cached;

    const response = await this.cardsService.getCardById(user, id);
    await this.redisService.set(cacheKey, response, this.CACHE_TTL);

    return response;
  }

  @Roles(...Object.values(UserRole))
  @Patch(':id/status')
  @ApiProperty({
    title: 'Activate or Block Card',
    description: 'Update card status to ACTIVE, BLOCKED, or INACTIVE',
    type: UpdateCardStatusDto,
  })
  @ApiParam({ name: 'id', type: String, description: 'Card ID (UUID)' })
  @SwaggerResponse({ status: 200, description: 'Card status updated successfully' })
  @SwaggerResponse({ status: 404, description: 'Card not found or does not belong to user' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async updateCardStatus(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateCardStatusDto,
  ): Promise<ApiResponse<CardSelect>> {
    const response = await this.cardsService.updateCardStatus(user, id, dto);
    await this.invalidateCardCache(user.id, id);
    return response;
  }

  @Roles(...Object.values(UserRole))
  @Patch(':id/limits')
  @ApiProperty({
    title: 'Set Spending Limits',
    description: 'Set daily and/or monthly spending limits for a debit card',
    type: SetSpendingLimitsDto,
  })
  @ApiParam({ name: 'id', type: String, description: 'Card ID (UUID)' })
  @SwaggerResponse({ status: 200, description: 'Spending limits updated successfully' })
  @SwaggerResponse({ status: 400, description: 'Spending limits only apply to debit cards' })
  @SwaggerResponse({ status: 404, description: 'Card not found or does not belong to user' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async setSpendingLimits(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: SetSpendingLimitsDto,
  ): Promise<ApiResponse<CardSelect>> {
    const response = await this.cardsService.setSpendingLimits(user, id, dto);
    await this.invalidateCardCache(user.id, id);
    return response;
  }

  @Roles(...Object.values(UserRole))
  @Post(':id/pin-change')
  @ApiProperty({
    title: 'Confirm PIN Change / Reset',
    description: 'Record that the user has successfully changed or reset their card PIN (after verification)',
  })
  @ApiParam({ name: 'id', type: String, description: 'Card ID (UUID)' })
  @SwaggerResponse({ status: 200, description: 'PIN change recorded successfully' })
  @SwaggerResponse({ status: 404, description: 'Card not found or does not belong to user' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async recordPinChange(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<ApiResponse<{ pinChangedAt: Date }>> {
    const response = await this.cardsService.recordPinChange(user, id);
    await this.invalidateCardCache(user.id, id);
    return response;
  }
}
