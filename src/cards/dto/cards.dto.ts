import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, Min, Max, IsDateString } from 'class-validator';
import { CardStatus } from '@db';

export class UpdateCardStatusDto {
  @IsNotEmpty({ message: 'Status is required' })
  @IsEnum(CardStatus, { message: 'Invalid card status' })
  @ApiProperty({ enum: CardStatus, required: true, example: CardStatus.BLOCKED })
  status: CardStatus;
}

export class SetSpendingLimitsDto {
  @IsOptional()
  @IsNumber({}, { message: 'Daily limit must be a number' })
  @IsPositive({ message: 'Daily limit must be positive' })
  @Min(0.01, { message: 'Daily limit must be at least 0.01' })
  @ApiProperty({ type: Number, required: false, example: 50000, description: 'Daily spending limit in PKR' })
  spendingLimitDaily?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Monthly limit must be a number' })
  @IsPositive({ message: 'Monthly limit must be positive' })
  @Min(0.01, { message: 'Monthly limit must be at least 0.01' })
  @ApiProperty({ type: Number, required: false, example: 200000, description: 'Monthly spending limit in PKR' })
  spendingLimitMonthly?: number;
}

export class GetCardStatementQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @ApiProperty({ type: Number, required: false, example: 1 })
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @ApiProperty({ type: Number, required: false, example: 20 })
  limit?: number;

  @IsOptional()
  @IsDateString()
  @ApiProperty({ type: String, required: false, example: '2026-01-01', description: 'Start date (YYYY-MM-DD)' })
  startDate?: string;

  @IsOptional()
  @IsDateString()
  @ApiProperty({ type: String, required: false, example: '2026-01-31', description: 'End date (YYYY-MM-DD)' })
  endDate?: string;
}

export class GetCardPaymentHistoryQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @ApiProperty({ type: Number, required: false, example: 1 })
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @ApiProperty({ type: Number, required: false, example: 20 })
  limit?: number;

  @IsOptional()
  @IsDateString()
  @ApiProperty({ type: String, required: false, example: '2026-01-01' })
  startDate?: string;

  @IsOptional()
  @IsDateString()
  @ApiProperty({ type: String, required: false, example: '2026-01-31' })
  endDate?: string;
}
