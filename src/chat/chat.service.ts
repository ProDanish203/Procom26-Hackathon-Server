import { Injectable } from '@nestjs/common';
import { AppLoggerService } from 'src/common/services/logger.service';
import { SendMessageDto } from './dto/chat.dto';

export interface ChatbotReply {
  text: string;
  timestamp: Date;
}

@Injectable()
export class ChatService {
  private readonly logger = new AppLoggerService(ChatService.name);

  async handleMessage(_userId: string, dto: SendMessageDto): Promise<ChatbotReply> {
    this.logger.log(`Chatbot message received from user (placeholder): ${dto.text?.slice(0, 50)}`);

    const reply: ChatbotReply = {
      text:
        'Thanks for your message. Our banking assistant is coming soon. We have received: "' +
        (dto.text || '').slice(0, 100) +
        '"',
      timestamp: new Date(),
    };

    return reply;
  }
}
