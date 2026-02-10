import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { PrismaService } from 'src/common/services/prisma.service';
import { AiModule } from 'src/ai/ai.module';
import { ChatController } from './chat.controller';

@Module({
  imports: [AiModule],
  providers: [ChatGateway, ChatService, PrismaService],
  exports: [ChatService],
  controllers: [ChatController],
})
export class ChatModule {}
