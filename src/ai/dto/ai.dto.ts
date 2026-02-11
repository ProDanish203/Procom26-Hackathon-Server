import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export class GenerateTextDto {
  @ApiProperty({ description: 'User prompt for text generation', example: 'Summarize my spending this month.' })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  prompt: string;

  @ApiPropertyOptional({ description: 'Optional system prompt override' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  systemPrompt?: string;
}

export class BankStatementAnalyzerQueryDto {
  @ApiPropertyOptional({ description: "Account ID (UUID). If omitted, uses the user's first active account." })
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @ApiProperty({
    description: 'Start date for statement period (YYYY-MM-DD)',
    example: '2026-01-01',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'startDate must be YYYY-MM-DD' })
  startDate: string;

  @ApiProperty({
    description: 'End date for statement period (YYYY-MM-DD)',
    example: '2026-01-31',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'endDate must be YYYY-MM-DD' })
  endDate: string;
}

export class EmiAffordabilityDto {
  @ApiProperty({ description: 'Loan principal amount (PKR)', example: 500000 })
  @IsNumber()
  @Min(1000)
  @Max(50000000)
  principal: number;

  @ApiProperty({ description: 'Tenure in months', example: 12 })
  @IsNumber()
  @Min(1)
  @Max(360)
  tenureMonths: number;

  @ApiPropertyOptional({ description: 'Annual interest rate (%). Default 12', example: 12.5 })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(50)
  interestRateAnnual?: number;

  @ApiPropertyOptional({ description: 'Account ID to base outflow analysis on. If omitted, uses all user accounts.' })
  @IsOptional()
  @IsUUID()
  accountId?: string;
}
