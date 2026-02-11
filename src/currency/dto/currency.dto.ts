import { IsNumber, IsPositive, IsString, Length, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AnalyzeTransferDto {
  @IsNumber()
  @IsPositive()
  @ApiProperty({ type: Number, required: true, example: 50000, description: 'Amount to transfer' })
  amount: number;

  @IsString()
  @Length(3, 3)
  @ApiProperty({ type: String, required: true, example: 'USD', description: 'Source currency (ISO code)' })
  fromCurrency: string;

  @IsString()
  @Length(3, 3)
  @ApiProperty({ type: String, required: true, example: 'PKR', description: 'Target currency (ISO code)' })
  toCurrency: string;
}

export class GetRateQueryDto {
  @IsString()
  @Length(3, 3)
  @ApiProperty({ type: String, required: true, example: 'USD', description: 'Source currency (ISO code)' })
  from: string;

  @IsString()
  @Length(3, 3)
  @ApiProperty({ type: String, required: true, example: 'PKR', description: 'Target currency (ISO code)' })
  to: string;
}

export class GetTrendsQueryDto extends GetRateQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(365)
  @ApiProperty({ type: Number, required: false, example: 30, description: 'Number of days for historical data' })
  days?: number;
}
