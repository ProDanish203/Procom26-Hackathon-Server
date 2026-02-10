import { Injectable } from '@nestjs/common';
import { AppLoggerService } from 'src/common/services/logger.service';
import { AiService } from 'src/ai/ai.service';
import { SendMessageDto } from './dto/chat.dto';

export interface ChatbotReply {
  text: string;
  timestamp: Date;
}

@Injectable()
export class ChatService {
  private readonly logger = new AppLoggerService(ChatService.name);

  constructor(private readonly aiService: AiService) {}

  async handleMessage(userId: string, dto: SendMessageDto): Promise<ChatbotReply> {
    const text = await this.aiService.chatReply(userId, dto.text?.trim() ?? '');

    return {
      text: text || 'I could not generate a response. Please try again.',
      timestamp: new Date(),
    };
  }
}
