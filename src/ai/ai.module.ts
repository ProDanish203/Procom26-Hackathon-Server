import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { PrismaService } from 'src/common/services/prisma.service';
import { EmiModule } from 'src/emi/emi.module';

@Module({
  imports: [EmiModule],
  controllers: [AiController],
  providers: [AiService, PrismaService],
  exports: [AiService],
})
export class AiModule {}
