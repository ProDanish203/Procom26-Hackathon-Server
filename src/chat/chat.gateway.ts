import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import type { Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/common/services/prisma.service';
import { AppLoggerService } from 'src/common/services/logger.service';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/chat.dto';

export interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  namespace: '/chat',
  path: '/socket.io',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new AppLoggerService(ChatGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly chatService: ChatService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn('Chat connection rejected: no token');
        client.disconnect();
        return;
      }

      const secret = this.configService.getOrThrow<string>('JWT_SECRET');
      const payload = (await this.jwtService.verifyAsync(token, { secret })) as { id?: string };

      if (!payload?.id) {
        this.logger.warn('Chat connection rejected: invalid token payload');
        client.disconnect();
        return;
      }

      const user = await this.prismaService.user.findUnique({
        where: { id: payload.id },
        select: { id: true },
      });

      if (!user) {
        this.logger.warn(`Chat connection rejected: user not found ${payload.id}`);
        client.disconnect();
        return;
      }

      client.userId = user.id;
      client.join(`user:${user.id}`);
      this.logger.log(`Chat connected: user ${user.id}`);
    } catch (error) {
      this.logger.warn('Chat connection rejected', (error as Error)?.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.logger.log(`Chat disconnected: user ${client.userId}`);
    }
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() data: SendMessageDto) {
    if (!client.userId) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    try {
      const reply = await this.chatService.handleMessage(client.userId, data);
      client.emit('bot-message', reply);
    } catch (error) {
      this.logger.error('Chat send-message error', (error as Error)?.stack, ChatGateway.name);
      client.emit('error', { message: (error as Error)?.message || 'Failed to process message' });
    }
  }

  private extractToken(client: Socket): string | null {
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.replace('Bearer ', '').trim();
    }
    const token = client.handshake.auth?.token;
    if (token) return typeof token === 'string' ? token : null;
    return null;
  }
}
