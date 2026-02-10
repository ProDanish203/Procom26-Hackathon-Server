import { Body, Controller, Get, Logger, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User, UserRole } from '@db';
import { ApiResponse } from 'src/common/types';
import { AiService } from './ai.service';
import { GenerateTextDto, BankStatementAnalyzerQueryDto } from './dto/ai.dto';
import type { BankStatementAnalysis } from './types';

@Controller('ai')
@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(private readonly aiService: AiService) {}

  @Roles(...Object.values(UserRole))
  @Post('generate-text')
  @ApiOperation({
    summary: 'Generate text',
    description:
      'Generate text using the AI model (Gemini). Optional system prompt and tool usage (e.g. fetch user bank statement from DB).',
  })
  @SwaggerResponse({ status: 200, description: 'Text generated successfully' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  @SwaggerResponse({ status: 503, description: 'GEMINI_API_KEY not configured' })
  async generateText(
    @CurrentUser() _user: User,
    @Body() dto: GenerateTextDto,
  ): Promise<
    ApiResponse<{
      text: string;
      usage?: { promptTokens: number; completionTokens: number };
    }>
  > {
    const result = await this.aiService.generateText({
      prompt: dto.prompt,
      systemPrompt: dto.systemPrompt,
      tools: false,
    });
    const usage = result.usage
      ? {
          promptTokens: result.usage.inputTokens ?? 0,
          completionTokens: result.usage.outputTokens ?? 0,
        }
      : undefined;
    return {
      message: 'Text generated successfully',
      success: true,
      data: {
        text: result.text,
        usage,
      },
    };
  }

  @Roles(...Object.values(UserRole))
  @Post('generate-text-with-tools')
  @ApiOperation({
    summary: 'Generate text with tools',
    description:
      'Generate text with access to tools (e.g. getUserBankStatement). The model can call the database via Prisma to fetch user data.',
  })
  @SwaggerResponse({ status: 200, description: 'Text generated successfully' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  @SwaggerResponse({ status: 503, description: 'GEMINI_API_KEY not configured' })
  async generateTextWithTools(
    @CurrentUser() _user: User,
    @Body() dto: GenerateTextDto,
  ): Promise<
    ApiResponse<{
      text: string;
      usage?: { promptTokens: number; completionTokens: number };
      steps?: unknown[];
    }>
  > {
    const result = await this.aiService.generateText({
      prompt: dto.prompt,
      systemPrompt: dto.systemPrompt,
      tools: true,
      maxSteps: 5,
    });
    const usage = result.usage
      ? {
          promptTokens: result.usage.inputTokens ?? 0,
          completionTokens: result.usage.outputTokens ?? 0,
        }
      : undefined;
    return {
      message: 'Text generated successfully',
      success: true,
      data: {
        text: result.text,
        usage,
        steps: result.steps,
      },
    };
  }

  @Roles(...Object.values(UserRole))
  @Post('stream-text')
  @ApiOperation({
    summary: 'Stream text',
    description: 'Stream generated text from the AI model. Response is a Server-Sent Events (SSE) stream.',
  })
  @SwaggerResponse({ status: 200, description: 'Text stream' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  @SwaggerResponse({ status: 503, description: 'GEMINI_API_KEY not configured' })
  async streamText(@CurrentUser() _user: User, @Body() dto: GenerateTextDto, @Res() res: Response): Promise<void> {
    const stream = this.aiService.streamText({
      prompt: dto.prompt,
      systemPrompt: dto.systemPrompt,
      tools: false,
      onError: (err) => this.logger.error(String(err)),
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    for await (const chunk of stream.textStream) {
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    }
    res.end();
  }

  @Roles(...Object.values(UserRole))
  @Get('bank-statement/analyze')
  @ApiOperation({
    summary: 'Analyze bank statement',
    description:
      "Fetches the current user's bank statement from the database for the given period, analyzes it with AI, and returns a structured summary, feedback, and improvement hints.",
  })
  @ApiQuery({
    name: 'accountId',
    required: false,
    type: String,
    description: "Account ID (UUID). If omitted, uses the user's first active account.",
  })
  @ApiQuery({
    name: 'startDate',
    required: true,
    type: String,
    example: '2026-01-01',
    description: 'Start date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: true,
    type: String,
    example: '2026-01-31',
    description: 'End date (YYYY-MM-DD)',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Analysis completed successfully',
    schema: {
      example: {
        message: 'Bank statement analyzed successfully',
        success: true,
        data: {
          summary: 'Over the period you had 15 transactions...',
          feedback: 'Spending was concentrated in dining and shopping...',
          improvementHints: [
            'Consider setting a monthly dining budget',
            'You had several small transfers; batching could reduce fees',
          ],
        },
      },
    },
  })
  @SwaggerResponse({ status: 400, description: 'Invalid date format' })
  @SwaggerResponse({ status: 404, description: 'Account not found' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  @SwaggerResponse({ status: 503, description: 'GEMINI_API_KEY not configured' })
  async analyzeBankStatement(
    @CurrentUser() user: User,
    @Query() query: BankStatementAnalyzerQueryDto,
  ): Promise<ApiResponse<BankStatementAnalysis>> {
    const start = new Date(query.startDate);
    const end = new Date(query.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date format. Use YYYY-MM-DD.');
    }

    const analysis = await this.aiService.analyzeBankStatement(user, query.accountId, start, end);

    return {
      message: 'Bank statement analyzed successfully',
      success: true,
      data: analysis,
    };
  }
}
