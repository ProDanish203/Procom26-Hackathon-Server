import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/services/prisma.service';
import { AppLoggerService } from 'src/common/services/logger.service';
import { ApiResponse } from 'src/common/types';
import { throwError } from 'src/common/utils/helpers';
import {
  UpdateCardStatusDto,
  SetSpendingLimitsDto,
  GetCardStatementQueryDto,
  GetCardPaymentHistoryQueryDto,
} from './dto/cards.dto';
import { CardSelect, cardSelect, cardWithAccountSelect } from './queries';
import {
  GetCardsResponse,
  CardMaskedDto,
  CreditCardSummaryResponse,
  GetCardStatementResponse,
  GetCardPaymentHistoryResponse,
} from './types';
import { User, CardType, CardStatus, AccountType, PaymentType, Prisma } from '@db';
import { transactionSelect } from 'src/transaction/queries';
import { paymentSelect } from 'src/payment/queries';

@Injectable()
export class CardsService {
  private readonly logger = new AppLoggerService(CardsService.name);

  constructor(private readonly prismaService: PrismaService) {}

  private toMaskedNumber(lastFourDigits: string): string {
    return `**** **** **** ${lastFourDigits}`;
  }

  private toMaskedCard(card: CardSelect & { account?: unknown }): CardMaskedDto {
    return {
      ...card,
      maskedNumber: this.toMaskedNumber(card.lastFourDigits),
    } as CardMaskedDto;
  }

  private async getCardForUser(user: User, cardId: string) {
    const card = await this.prismaService.card.findFirst({
      where: { id: cardId, userId: user.id },
      select: cardWithAccountSelect,
    });
    if (!card) throw throwError('Card not found', HttpStatus.NOT_FOUND);
    return card;
  }

  async getAllCards(user: User, cardType?: CardType): Promise<ApiResponse<GetCardsResponse>> {
    try {
      const where: Prisma.CardWhereInput = { userId: user.id };
      if (cardType) where.cardType = cardType;

      const [cards, totalCount] = await Promise.all([
        this.prismaService.card.findMany({
          where,
          select: cardWithAccountSelect,
          orderBy: { createdAt: 'desc' },
        }),
        this.prismaService.card.count({ where }),
      ]);

      const maskedCards = cards.map((c) => this.toMaskedCard(c));

      return {
        message: 'Cards retrieved successfully',
        success: true,
        data: { cards: maskedCards, totalCount },
      };
    } catch (err) {
      this.logger.error('Failed to retrieve cards', err.stack, CardsService.name);
      throw throwError(err.message || 'Failed to retrieve cards', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getCardById(user: User, cardId: string): Promise<ApiResponse<CardMaskedDto>> {
    try {
      const card = await this.getCardForUser(user, cardId);
      return {
        message: 'Card retrieved successfully',
        success: true,
        data: this.toMaskedCard(card),
      };
    } catch (err) {
      this.logger.error('Failed to retrieve card', err.stack, CardsService.name);
      throw throwError(err.message || 'Failed to retrieve card', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async updateCardStatus(
    user: User,
    cardId: string,
    dto: UpdateCardStatusDto,
  ): Promise<ApiResponse<CardSelect>> {
    try {
      await this.getCardForUser(user, cardId);

      const card = await this.prismaService.card.update({
        where: { id: cardId },
        data: { status: dto.status },
        select: cardSelect,
      });

      this.logger.log(`Card status updated: ${cardId} -> ${dto.status}`);

      return {
        message: `Card ${dto.status === CardStatus.ACTIVE ? 'activated' : dto.status === CardStatus.BLOCKED ? 'blocked' : 'updated'} successfully`,
        success: true,
        data: card,
      };
    } catch (err) {
      this.logger.error('Failed to update card status', err.stack, CardsService.name);
      throw throwError(err.message || 'Failed to update card status', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async setSpendingLimits(
    user: User,
    cardId: string,
    dto: SetSpendingLimitsDto,
  ): Promise<ApiResponse<CardSelect>> {
    try {
      const card = await this.getCardForUser(user, cardId);

      if (card.cardType !== CardType.DEBIT) {
        throw throwError('Spending limits are only applicable to debit cards', HttpStatus.BAD_REQUEST);
      }

      const data: Prisma.CardUpdateInput = {};
      if (dto.spendingLimitDaily !== undefined) data.spendingLimitDaily = dto.spendingLimitDaily;
      if (dto.spendingLimitMonthly !== undefined) data.spendingLimitMonthly = dto.spendingLimitMonthly;

      const updated = await this.prismaService.card.update({
        where: { id: cardId },
        data,
        select: cardSelect,
      });

      this.logger.log(`Spending limits updated for card: ${cardId}`);

      return {
        message: 'Spending limits updated successfully',
        success: true,
        data: updated,
      };
    } catch (err) {
      this.logger.error('Failed to set spending limits', err.stack, CardsService.name);
      throw throwError(err.message || 'Failed to set spending limits', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async recordPinChange(user: User, cardId: string): Promise<ApiResponse<{ pinChangedAt: Date }>> {
    try {
      await this.getCardForUser(user, cardId);

      const card = await this.prismaService.card.update({
        where: { id: cardId },
        data: { pinChangedAt: new Date() },
        select: { pinChangedAt: true },
      });

      this.logger.log(`PIN change recorded for card: ${cardId}`);

      return {
        message: 'PIN change recorded successfully',
        success: true,
        data: { pinChangedAt: card.pinChangedAt! },
      };
    } catch (err) {
      this.logger.error('Failed to record PIN change', err.stack, CardsService.name);
      throw throwError(err.message || 'Failed to record PIN change', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getCardStatement(
    user: User,
    cardId: string,
    query: GetCardStatementQueryDto,
  ): Promise<ApiResponse<GetCardStatementResponse>> {
    try {
      await this.getCardForUser(user, cardId);

      const { page = 1, limit = 20, startDate, endDate } = query;

      const where: Prisma.TransactionWhereInput = { cardId };

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
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
        message: 'Card statement retrieved successfully',
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
      this.logger.error('Failed to retrieve card statement', err.stack, CardsService.name);
      throw throwError(
        err.message || 'Failed to retrieve card statement',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getCreditCardSummary(user: User, cardId: string): Promise<ApiResponse<CreditCardSummaryResponse>> {
    try {
      const card = await this.getCardForUser(user, cardId);

      if (card.cardType !== CardType.CREDIT) {
        throw throwError('Summary is only available for credit cards', HttpStatus.BAD_REQUEST);
      }

      const account = await this.prismaService.account.findFirst({
        where: { id: card.accountId, userId: user.id },
      });

      if (!account || account.accountType !== AccountType.CREDIT_CARD) {
        throw throwError('Account not found or is not a credit card account', HttpStatus.NOT_FOUND);
      }

      const creditLimit = Number(account.creditLimit ?? 0);
      const availableCredit = Number(account.availableCredit ?? 0);
      const currentBalance = creditLimit - availableCredit;

      const summary: CreditCardSummaryResponse = {
        cardId: card.id,
        accountId: account.id,
        currentBalance,
        availableCredit,
        creditLimit,
        minimumPaymentDue: account.minimumPaymentDue != null ? Number(account.minimumPaymentDue) : null,
        dueDate: account.dueDate ?? null,
        rewardsPoints: card.rewardsPoints,
        currency: account.currency ?? 'PKR',
      };

      return {
        message: 'Credit card summary retrieved successfully',
        success: true,
        data: summary,
      };
    } catch (err) {
      this.logger.error('Failed to retrieve credit card summary', err.stack, CardsService.name);
      throw throwError(
        err.message || 'Failed to retrieve credit card summary',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getCreditCardPaymentHistory(
    user: User,
    cardId: string,
    query: GetCardPaymentHistoryQueryDto,
  ): Promise<ApiResponse<GetCardPaymentHistoryResponse>> {
    try {
      const card = await this.getCardForUser(user, cardId);

      if (card.cardType !== CardType.CREDIT) {
        throw throwError('Payment history is only available for credit cards', HttpStatus.BAD_REQUEST);
      }

      const { page = 1, limit = 20, startDate, endDate } = query;

      const where: Prisma.PaymentWhereInput = {
        userId: user.id,
        accountId: card.accountId,
        paymentType: PaymentType.CREDIT_CARD_PAYMENT,
      };

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
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
        message: 'Credit card payment history retrieved successfully',
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
      this.logger.error('Failed to retrieve credit card payment history', err.stack, CardsService.name);
      throw throwError(
        err.message || 'Failed to retrieve credit card payment history',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
