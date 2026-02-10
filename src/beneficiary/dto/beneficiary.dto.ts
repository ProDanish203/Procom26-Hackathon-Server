import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
  Matches,
  IsBoolean,
} from 'class-validator';
import { BeneficiaryType } from '@db';

export class AddBeneficiaryDto {
  @IsNotEmpty({ message: 'Beneficiary type is required' })
  @IsEnum(BeneficiaryType, { message: 'Invalid beneficiary type' })
  @ApiProperty({ enum: BeneficiaryType, required: true, example: BeneficiaryType.RAAST })
  beneficiaryType: BeneficiaryType;

  @IsNotEmpty({ message: 'Nickname is required' })
  @IsString({ message: 'Nickname must be a string' })
  @ApiProperty({ type: String, required: true, example: 'Mom - Savings Account' })
  nickname: string;

  // Bank transfer fields
  @ValidateIf((o) => o.beneficiaryType === BeneficiaryType.DESI_BANK || o.beneficiaryType === BeneficiaryType.OTHER_BANK)
  @IsNotEmpty({ message: 'Account number is required for bank transfers' })
  @IsString()
  @ApiProperty({ type: String, required: false, example: '1234567890' })
  accountNumber?: string;

  @ValidateIf((o) => o.beneficiaryType === BeneficiaryType.RAAST)
  @IsNotEmpty({ message: 'IBAN is required for RAAST transfers' })
  @IsString()
  @Matches(/^PK\d{2}[A-Z]{4}\d{16}$/, { message: 'Invalid IBAN format' })
  @ApiProperty({ type: String, required: false, example: 'PK36DESI1234567890123456' })
  iban?: string;

  @ValidateIf((o) => o.beneficiaryType === BeneficiaryType.OTHER_BANK)
  @IsNotEmpty({ message: 'Bank name is required for IBFT transfers' })
  @IsString()
  @ApiProperty({ type: String, required: false, example: 'HBL' })
  bankName?: string;

  @ValidateIf((o) => o.beneficiaryType === BeneficiaryType.DESI_BANK || o.beneficiaryType === BeneficiaryType.OTHER_BANK || o.beneficiaryType === BeneficiaryType.RAAST)
  @IsOptional()
  @IsString()
  @ApiProperty({ type: String, required: false, example: 'Muhammad Ali' })
  accountTitle?: string;

  // Bill payment fields
  @ValidateIf((o) => o.beneficiaryType === BeneficiaryType.BILLER)
  @IsNotEmpty({ message: 'Consumer number is required for bill payments' })
  @IsString()
  @ApiProperty({ type: String, required: false, example: '12345678901234' })
  consumerNumber?: string;

  @ValidateIf((o) => o.beneficiaryType === BeneficiaryType.BILLER)
  @IsNotEmpty({ message: 'Biller name is required' })
  @IsString()
  @ApiProperty({ type: String, required: false, example: 'K-Electric' })
  billerName?: string;

  @ValidateIf((o) => o.beneficiaryType === BeneficiaryType.BILLER)
  @IsOptional()
  @IsString()
  @ApiProperty({ type: String, required: false, example: 'Electricity' })
  billerCategory?: string;

  // Mobile recharge fields
  @ValidateIf((o) => o.beneficiaryType === BeneficiaryType.MOBILE)
  @IsNotEmpty({ message: 'Mobile number is required' })
  @IsString()
  @Matches(/^03\d{9}$/, { message: 'Invalid mobile number format. Use 03XXXXXXXXX' })
  @ApiProperty({ type: String, required: false, example: '03001234567' })
  mobileNumber?: string;

  @ValidateIf((o) => o.beneficiaryType === BeneficiaryType.MOBILE)
  @IsNotEmpty({ message: 'Mobile operator is required' })
  @IsString()
  @ApiProperty({ type: String, required: false, example: 'Jazz', enum: ['Jazz', 'Telenor', 'Zong', 'Ufone'] })
  mobileOperator?: string;
}

export class UpdateBeneficiaryDto {
  @IsOptional()
  @IsString({ message: 'Nickname must be a string' })
  @ApiProperty({ type: String, required: false, example: 'Updated Nickname' })
  nickname?: string;

  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  @ApiProperty({ type: Boolean, required: false, example: true })
  isActive?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'isFavorite must be a boolean' })
  @ApiProperty({ type: Boolean, required: false, example: true })
  isFavorite?: boolean;
}
