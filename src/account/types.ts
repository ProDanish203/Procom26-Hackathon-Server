import { AccountSelect, AccountWithTransactionsSelect } from './queries';

export interface DashboardData {
  accounts: AccountWithTransactionsSelect[];
  summary: {
    totalBalance: number;
    totalAccounts: number;
    activeAccounts: number;
    totalCreditLimit: number;
    totalAvailableCredit: number;
  };
  recentTransactions: any[];
}

export interface AccountStatement {
  account: AccountSelect;
  transactions: any[];
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
}
