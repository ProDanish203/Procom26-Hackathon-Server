import { Module } from '@nestjs/common';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { PrismaService } from 'src/common/services/prisma.service';
import { RedisService } from 'src/common/services/redis.service';

@Module({
  controllers: [TransactionController],
  providers: [TransactionService, PrismaService, RedisService],
  exports: [TransactionService],
})
export class TransactionModule {}
