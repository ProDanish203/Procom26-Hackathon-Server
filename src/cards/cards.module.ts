import { Module } from '@nestjs/common';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';
import { PrismaService } from 'src/common/services/prisma.service';
import { RedisService } from 'src/common/services/redis.service';

@Module({
  controllers: [CardsController],
  providers: [CardsService, PrismaService, RedisService],
  exports: [CardsService],
})
export class CardsModule {}
