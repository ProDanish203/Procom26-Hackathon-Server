import { Injectable } from '@nestjs/common';
import { AppLoggerService } from 'src/common/services/logger.service';
import { AiService } from 'src/ai/ai.service';
import { SendMessageDto } from './dto/chat.dto';

export interface ChatbotReply {
  text: string;
  timestamp: Date;
}

const MAX_HISTORY_MESSAGES = 30;

@Injectable()
export class ChatService {
  private readonly logger = new AppLoggerService(ChatService.name);

  private readonly conversationHistory = new Map<
    string,
    Array<{ role: 'user' | 'assistant'; content: string }>
  >();

  constructor(private readonly aiService: AiService) {}

  async handleMessage(
    userId: string,
    socketId: string,
    dto: SendMessageDto,
  ): Promise<ChatbotReply> {
    const userContent = dto.text?.trim() ?? '';
    const history = this.getOrCreateHistory(socketId);
    history.push({ role: 'user', content: userContent });

    const messages = history.slice(-MAX_HISTORY_MESSAGES);
    const replyText =
      (await this.aiService.chatReplyWithHistory(userId, messages)) ||
      'I could not generate a response. Please try again.';

    history.push({ role: 'assistant', content: replyText });

    return {
      text: replyText,
      timestamp: new Date(),
    };
  }

  clearHistory(socketId: string): void {
    this.conversationHistory.delete(socketId);
    this.logger.log(`Chat history cleared for socket ${socketId}`);
  }

  private getOrCreateHistory(
    socketId: string,
  ): Array<{ role: 'user' | 'assistant'; content: string }> {
    let history = this.conversationHistory.get(socketId);
    if (!history) {
      history = [];
      this.conversationHistory.set(socketId, history);
    }
    return history;
  }
}
