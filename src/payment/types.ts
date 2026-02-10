import { PaymentSelect } from './queries';

export interface GetPaymentsResponse {
  payments: PaymentSelect[];
  pagination: {
    totalCount: number;
    totalPages: number;
    page: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
