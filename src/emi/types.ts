import { EmiPlanSelect, EmiInstallmentSelect } from './queries';

export interface GetEmiPlansResponse {
  plans: EmiPlanSelect[];
  pagination: {
    totalCount: number;
    totalPages: number;
    page: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface GetEmiScheduleResponse {
  plan: EmiPlanSelect;
  installments: EmiInstallmentSelect[];
}
