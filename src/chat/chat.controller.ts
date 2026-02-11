import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User, UserRole } from '@db';
import { ApiResponse } from 'src/common/types';
import { ChatService, type ChatbotReply } from './chat.service';
import { SendMessageDto } from './dto/chat.dto';

@Controller('chat')
@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Roles(...Object.values(UserRole))
  @Post('send-message')
  @ApiOperation({
    summary: 'Send message to chatbot',
    description:
      'Send a message to the banking assistant. Same flow as the WebSocket send-message event. Use this to test the chatbot without WebSockets.',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Bot reply received',
    schema: {
      example: {
        message: 'Message sent successfully',
        success: true,
        data: { text: 'Your current balance is...', timestamp: '2026-02-11T12:00:00.000Z' },
      },
    },
  })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  @SwaggerResponse({ status: 503, description: 'GEMINI_API_KEY not configured' })
  async sendMessage(@CurrentUser() user: User, @Body() dto: SendMessageDto): Promise<ApiResponse<ChatbotReply>> {
    const reply = await this.chatService.handleMessage(user.id, `http:${user.id}`, dto);
    return {
      message: 'Message sent successfully',
      success: true,
      data: reply,
    };
  }
}
