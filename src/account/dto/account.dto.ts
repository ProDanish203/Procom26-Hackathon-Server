import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { AccountType, AccountStatus } from '@db';

export class CreateAccountDto {
  @IsNotEmpty({ message: 'Account type is required' })
  @IsEnum(AccountType, { message: 'Invalid account type' })
  @ApiProperty({ enum: AccountType, required: true, example: AccountType.CURRENT })
  accountType: AccountType;

  @IsOptional()
  @IsString({ message: 'Nickname must be a string' })
  @ApiProperty({ type: String, required: false, example: 'My Savings Account' })
  nickname?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Credit limit must be a number' })
  @IsPositive({ message: 'Credit limit must be positive' })
  @Min(100, { message: 'Credit limit must be at least 100' })
  @ApiProperty({ type: Number, required: false, example: 5000, description: 'Required for CREDIT_CARD type' })
  creditLimit?: number;
}

export class UpdateAccountDto {
  @IsOptional()
  @IsString({ message: 'Nickname must be a string' })
  @ApiProperty({ type: String, required: false, example: 'Updated Account Name' })
  nickname?: string;

  @IsOptional()
  @IsEnum(AccountStatus, { message: 'Invalid account status' })
  @ApiProperty({ enum: AccountStatus, required: false, example: AccountStatus.ACTIVE })
  accountStatus?: AccountStatus;
}
