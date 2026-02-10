import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { PrismaService } from 'src/common/services/prisma.service';

@Module({
  providers: [ChatGateway, ChatService, PrismaService],
  exports: [ChatService],
})
export class ChatModule {}
