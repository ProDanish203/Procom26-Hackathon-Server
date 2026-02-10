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
  Max,
  IsDateString,
  Matches,
} from 'class-validator';
import { PaymentType, PaymentStatus } from '@db';

export class IBFTTransferDto {
  @IsNotEmpty({ message: 'Account ID is required' })
  @IsUUID('4', { message: 'Invalid account ID' })
  @ApiProperty({ type: String, required: true, example: '123e4567-e89b-12d3-a456-426614174000' })
  accountId: string;

  @IsOptional()
  @IsUUID('4', { message: 'Invalid beneficiary ID' })
  @ApiProperty({ type: String, required: false, example: '123e4567-e89b-12d3-a456-426614174001' })
  beneficiaryId?: string;

  @IsNotEmpty({ message: 'Recipient account number is required' })
  @IsString()
  @ApiProperty({ type: String, required: true, example: '1234567890' })
  recipientAccount: string;

  @IsNotEmpty({ message: 'Recipient bank is required' })
  @IsString()
  @ApiProperty({ type: String, required: true, example: 'HBL' })
  recipientBank: string;

  @IsNotEmpty({ message: 'Recipient name is required' })
  @IsString()
  @ApiProperty({ type: String, required: true, example: 'Muhammad Ali' })
  recipientName: string;

  @IsNotEmpty({ message: 'Amount is required' })
  @IsNumber({}, { message: 'Amount must be a number' })
  @IsPositive({ message: 'Amount must be positive' })
  @Min(1, { message: 'Minimum transfer amount is PKR 1' })
  @Max(1000000, { message: 'Maximum transfer amount is PKR 1,000,000' })
  @ApiProperty({ type: Number, required: true, example: 5000 })
  amount: number;

  @IsNotEmpty({ message: 'Description is required' })
  @IsString()
  @ApiProperty({ type: String, required: true, example: 'Payment for services' })
  description: string;
}

export class RAASTTransferDto {
  @IsNotEmpty({ message: 'Account ID is required' })
  @IsUUID('4', { message: 'Invalid account ID' })
  @ApiProperty({ type: String, required: true, example: '123e4567-e89b-12d3-a456-426614174000' })
  accountId: string;

  @IsOptional()
  @IsUUID('4', { message: 'Invalid beneficiary ID' })
  @ApiProperty({ type: String, required: false, example: '123e4567-e89b-12d3-a456-426614174001' })
  beneficiaryId?: string;

  @IsNotEmpty({ message: 'Recipient IBAN is required' })
  @IsString()
  @Matches(/^PK\d{2}[A-Z]{4}\d{16}$/, { message: 'Invalid IBAN format' })
  @ApiProperty({ type: String, required: true, example: 'PK36DESI1234567890123456' })
  recipientIban: string;

  @IsNotEmpty({ message: 'Recipient name is required' })
  @IsString()
  @ApiProperty({ type: String, required: true, example: 'Muhammad Ali' })
  recipientName: string;

  @IsNotEmpty({ message: 'Amount is required' })
  @IsNumber({}, { message: 'Amount must be a number' })
  @IsPositive({ message: 'Amount must be positive' })
  @Min(1, { message: 'Minimum transfer amount is PKR 1' })
  @Max(1000000, { message: 'Maximum transfer amount is PKR 1,000,000' })
  @ApiProperty({ type: Number, required: true, example: 5000 })
  amount: number;

  @IsNotEmpty({ message: 'Description is required' })
  @IsString()
  @ApiProperty({ type: String, required: true, example: 'Payment for services' })
  description: string;
}

export class BillPaymentDto {
  @IsNotEmpty({ message: 'Account ID is required' })
  @IsUUID('4', { message: 'Invalid account ID' })
  @ApiProperty({ type: String, required: true, example: '123e4567-e89b-12d3-a456-426614174000' })
  accountId: string;

  @IsOptional()
  @IsUUID('4', { message: 'Invalid beneficiary ID' })
  @ApiProperty({ type: String, required: false, example: '123e4567-e89b-12d3-a456-426614174001' })
  beneficiaryId?: string;

  @IsNotEmpty({ message: 'Biller name is required' })
  @IsString()
  @ApiProperty({ type: String, required: true, example: 'K-Electric' })
  billerName: string;

  @IsNotEmpty({ message: 'Consumer number is required' })
  @IsString()
  @ApiProperty({ type: String, required: true, example: '12345678901234' })
  consumerNumber: string;

  @IsNotEmpty({ message: 'Amount is required' })
  @IsNumber({}, { message: 'Amount must be a number' })
  @IsPositive({ message: 'Amount must be positive' })
  @Min(1, { message: 'Minimum payment amount is PKR 1' })
  @ApiProperty({ type: Number, required: true, example: 3500 })
  amount: number;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: String, required: false, example: 'January 2026' })
  billMonth?: string;

  @IsOptional()
  @IsDateString()
  @ApiProperty({ type: String, required: false, example: '2026-02-15' })
  dueDate?: string;
}

export class MobileRechargeDto {
  @IsNotEmpty({ message: 'Account ID is required' })
  @IsUUID('4', { message: 'Invalid account ID' })
  @ApiProperty({ type: String, required: true, example: '123e4567-e89b-12d3-a456-426614174000' })
  accountId: string;

  @IsNotEmpty({ message: 'Mobile number is required' })
  @IsString()
  @Matches(/^03\d{9}$/, { message: 'Invalid mobile number format. Use 03XXXXXXXXX' })
  @ApiProperty({ type: String, required: true, example: '03001234567' })
  mobileNumber: string;

  @IsNotEmpty({ message: 'Mobile operator is required' })
  @IsString()
  @ApiProperty({ type: String, required: true, example: 'Jazz', enum: ['Jazz', 'Telenor', 'Zong', 'Ufone'] })
  mobileOperator: string;

  @IsNotEmpty({ message: 'Amount is required' })
  @IsNumber({}, { message: 'Amount must be a number' })
  @IsPositive({ message: 'Amount must be positive' })
  @Min(10, { message: 'Minimum recharge amount is PKR 10' })
  @Max(10000, { message: 'Maximum recharge amount is PKR 10,000' })
  @ApiProperty({ type: Number, required: true, example: 100 })
  amount: number;
}

export class GetPaymentsQueryDto {
  @IsOptional()
  @IsNumber()
  @ApiProperty({ type: Number, required: false, example: 1 })
  page?: number;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ type: Number, required: false, example: 20 })
  limit?: number;

  @IsOptional()
  @IsEnum(PaymentType)
  @ApiProperty({ enum: PaymentType, required: false })
  type?: PaymentType;

  @IsOptional()
  @IsEnum(PaymentStatus)
  @ApiProperty({ enum: PaymentStatus, required: false })
  status?: PaymentStatus;

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
  @ApiProperty({ type: String, required: false, example: 'electricity' })
  search?: string;
}
