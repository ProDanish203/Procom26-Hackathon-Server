import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { EmiPlanStatus } from '@db';

export class CreateEmiPlanDto {
  @IsNotEmpty({ message: 'Account ID is required' })
  @IsUUID('4', { message: 'Invalid account ID' })
  @ApiProperty({ type: String, required: true, example: '123e4567-e89b-12d3-a456-426614174000' })
  accountId: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ type: String, example: 'Personal Loan' })
  productName?: string;

  @IsNotEmpty({ message: 'Principal amount is required' })
  @IsNumber({}, { message: 'Principal must be a number' })
  @IsPositive({ message: 'Principal must be positive' })
  @Min(1000, { message: 'Minimum principal is PKR 1,000' })
  @Max(50000000, { message: 'Maximum principal is PKR 50,000,000' })
  @ApiProperty({ type: Number, required: true, example: 500000 })
  principal: number;

  @IsNotEmpty({ message: 'Interest rate is required' })
  @IsNumber({}, { message: 'Interest rate must be a number' })
  @Min(0.1, { message: 'Minimum interest rate is 0.1%' })
  @Max(50, { message: 'Maximum interest rate is 50%' })
  @ApiProperty({ type: Number, required: true, example: 12.5, description: 'Annual interest rate (e.g. 12.5 for 12.5%)' })
  interestRateAnnual: number;

  @IsNotEmpty({ message: 'Tenure is required' })
  @IsNumber({}, { message: 'Tenure must be a number' })
  @IsPositive({ message: 'Tenure must be positive' })
  @Min(1, { message: 'Minimum tenure is 1 month' })
  @Max(360, { message: 'Maximum tenure is 360 months' })
  @ApiProperty({ type: Number, required: true, example: 12, description: 'Tenure in months' })
  tenureMonths: number;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({ type: String, example: '2026-02-15', description: 'First installment due date (default: next month same day)' })
  startDate?: string;
}

export class PayEmiInstallmentDto {
  @IsNotEmpty({ message: 'Account ID is required' })
  @IsUUID('4', { message: 'Invalid account ID' })
  @ApiProperty({ type: String, required: true, example: '123e4567-e89b-12d3-a456-426614174000' })
  accountId: string;
}

export class GetEmiPlansQueryDto {
  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ type: Number, example: 1 })
  page?: number;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ type: Number, example: 20 })
  limit?: number;

  @IsOptional()
  @IsEnum(EmiPlanStatus)
  @ApiPropertyOptional({ enum: EmiPlanStatus })
  status?: EmiPlanStatus;
}
