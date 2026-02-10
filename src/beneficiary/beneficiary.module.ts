import { Module } from '@nestjs/common';
import { BeneficiaryController } from './beneficiary.controller';
import { BeneficiaryService } from './beneficiary.service';
import { PrismaService } from 'src/common/services/prisma.service';
import { RedisService } from 'src/common/services/redis.service';

@Module({
  controllers: [BeneficiaryController],
  providers: [BeneficiaryService, PrismaService, RedisService],
  exports: [BeneficiaryService],
})
export class BeneficiaryModule {}
