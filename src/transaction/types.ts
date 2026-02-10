import { TransactionSelect } from './queries';

export interface GetTransactionsResponse {
  transactions: TransactionSelect[];
  pagination: {
    totalCount: number;
    totalPages: number;
    page: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface BankStatementAccount {
  id: string;
  accountNumber: string;
  iban: string | null;
  routingNumber: string | null;
  accountType: string;
  accountStatus: string;
  balance: number;
  currency: string;
  nickname: string | null;
  createdAt: Date;
}

export interface BankStatement {
  statementId: string;
  generatedAt: Date;
  account: BankStatementAccount;
  period: {
    startDate: Date;
    endDate: Date;
  };
  summary: {
    openingBalance: number;
    closingBalance: number;
    totalDeposits: number;
    totalWithdrawals: number;
    transactionCount: number;
  };
  transactions: TransactionSelect[];
}
