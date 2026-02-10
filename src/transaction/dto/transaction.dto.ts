import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  IsDateString,
} from 'class-validator';
import { TransactionType, TransactionStatus, TransactionCategory } from '@db';

export class TransferDto {
  @IsNotEmpty({ message: 'From account ID is required' })
  @IsUUID('4', { message: 'Invalid from account ID' })
  @ApiProperty({ type: String, required: true, example: '123e4567-e89b-12d3-a456-426614174000' })
  fromAccountId: string;

  @IsNotEmpty({ message: 'To account ID is required' })
  @IsUUID('4', { message: 'Invalid to account ID' })
  @ApiProperty({ type: String, required: true, example: '123e4567-e89b-12d3-a456-426614174001' })
  toAccountId: string;

  @IsNotEmpty({ message: 'Amount is required' })
  @IsNumber({}, { message: 'Amount must be a number' })
  @IsPositive({ message: 'Amount must be positive' })
  @Min(0.01, { message: 'Amount must be at least 0.01' })
  @ApiProperty({ type: Number, required: true, example: 100.5 })
  amount: number;

  @IsNotEmpty({ message: 'Description is required' })
  @IsString({ message: 'Description must be a string' })
  @ApiProperty({ type: String, required: true, example: 'Transfer to savings' })
  description: string;
}

export class DepositDto {
  @IsNotEmpty({ message: 'Account ID is required' })
  @IsUUID('4', { message: 'Invalid account ID' })
  @ApiProperty({ type: String, required: true, example: '123e4567-e89b-12d3-a456-426614174000' })
  accountId: string;

  @IsNotEmpty({ message: 'Amount is required' })
  @IsNumber({}, { message: 'Amount must be a number' })
  @IsPositive({ message: 'Amount must be positive' })
  @Min(1, { message: 'Minimum deposit amount is 1' })
  @ApiProperty({ type: Number, required: true, example: 5000 })
  amount: number;

  @IsNotEmpty({ message: 'Description is required' })
  @IsString({ message: 'Description must be a string' })
  @ApiProperty({ type: String, required: true, example: 'Cash deposit at branch' })
  description: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: String, required: false, example: 'Main Branch Karachi' })
  location?: string;
}

export class GetTransactionsQueryDto {
  @IsOptional()
  @IsNumber()
  @ApiProperty({ type: Number, required: false, example: 1 })
  page?: number;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ type: Number, required: false, example: 20 })
  limit?: number;

  @IsOptional()
  @IsEnum(TransactionType)
  @ApiProperty({ enum: TransactionType, required: false })
  type?: TransactionType;

  @IsOptional()
  @IsEnum(TransactionStatus)
  @ApiProperty({ enum: TransactionStatus, required: false })
  status?: TransactionStatus;

  @IsOptional()
  @IsEnum(TransactionCategory)
  @ApiProperty({ enum: TransactionCategory, required: false })
  category?: TransactionCategory;

  @IsOptional()
  @IsDateString()
  @ApiProperty({ type: String, required: false, example: '2026-01-01' })
  startDate?: string;

  @IsOptional()
  @IsDateString()
  @ApiProperty({ type: String, required: false, example: '2026-01-31' })
  endDate?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: String, required: false, example: 'coffee' })
  search?: string;
}

export class GetBankStatementQueryDto {
  @IsNotEmpty({ message: 'Start date is required' })
  @IsDateString({}, { message: 'Start date must be a valid date (YYYY-MM-DD)' })
  @ApiProperty({ type: String, required: true, example: '2026-01-01', description: 'Start date (YYYY-MM-DD)' })
  startDate: string;

  @IsNotEmpty({ message: 'End date is required' })
  @IsDateString({}, { message: 'End date must be a valid date (YYYY-MM-DD)' })
  @ApiProperty({ type: String, required: true, example: '2026-01-31', description: 'End date (YYYY-MM-DD)' })
  endDate: string;
}
