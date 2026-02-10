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
