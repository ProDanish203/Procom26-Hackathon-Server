import { Module } from '@nestjs/common';
import { EmiController } from './emi.controller';
import { EmiService } from './emi.service';
import { PrismaService } from 'src/common/services/prisma.service';

@Module({
  controllers: [EmiController],
  providers: [EmiService, PrismaService],
  exports: [EmiService],
})
export class EmiModule {}
