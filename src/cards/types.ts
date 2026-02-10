import { TransactionSelect } from 'src/transaction/queries';
import { PaymentSelect } from 'src/payment/queries';
import { PaginationInfo } from 'src/common/types';

export interface GetCardsResponse {
  cards: CardMaskedDto[];
  totalCount: number;
}

/** Masked card display for API responses (e.g. **** **** **** 1234) */
export interface CardMaskedDto {
  id: string;
  cardType: string;
  status: string;
  maskedNumber: string;
  lastFourDigits: string;
  expiryMonth: number;
  expiryYear: number;
  spendingLimitDaily?: number | null;
  spendingLimitMonthly?: number | null;
  pinChangedAt: Date | null;
  rewardsPoints: number;
  account?: {
    id: string;
    accountNumber: string;
    accountType: string;
    nickname: string | null;
    balance?: unknown;
    currency?: string;
    creditLimit?: unknown;
    availableCredit?: unknown;
    dueDate?: Date | null;
    minimumPaymentDue?: unknown;
  };
  createdAt: Date;
  updatedAt: Date;
}

/** Credit card summary: balance, available credit, minimum payment due, rewards */
export interface CreditCardSummaryResponse {
  cardId: string;
  accountId: string;
  currentBalance: number;
  availableCredit: number;
  creditLimit: number;
  minimumPaymentDue: number | null;
  dueDate: Date | null;
  rewardsPoints: number;
  currency: string;
}

export interface GetCardStatementResponse {
  transactions: TransactionSelect[];
  pagination: PaginationInfo;
}

export interface GetCardPaymentHistoryResponse {
  payments: PaymentSelect[];
  pagination: PaginationInfo;
}
