import { BeneficiarySelect } from './queries';

export interface GetAllBeneficiariesResponse {
  beneficiaries: BeneficiarySelect[];
  totalCount: number;
}
