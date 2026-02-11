import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, streamText, Output, stepCountIs, type LanguageModel, type ModelMessage } from 'ai';
import type { z } from 'zod';

export interface AIStreamTextResult {
  textStream: AsyncIterable<string>;
}
import { PrismaService } from 'src/common/services/prisma.service';
import { AppLoggerService } from 'src/common/services/logger.service';
import { throwError } from 'src/common/utils/helpers';
import {
  createGetUserBankStatementTool,
  createListUserAccountsTool,
  createGetRecentTransactionsTool,
  createGetAccountBalanceTool,
} from './tools';
import { BANKING_SYSTEM_PROMPT, BANK_STATEMENT_ANALYZER_PROMPT, CHAT_ASSISTANT_SYSTEM_PROMPT, getChatAssistantSystemPromptWithContext } from './prompts';
import { BankStatementAnalysisSchema, type BankStatementAnalysis } from './types';
import type { User } from '@db';

@Injectable()
export class AiService {
  private readonly logger = new AppLoggerService(AiService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {}

  private getGoogle() {
    return createGoogleGenerativeAI({
      apiKey: this.configService.get<string>('GEMINI_API_KEY') ?? '',
    });
  }

  getModel(): LanguageModel {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw throwError('GEMINI_API_KEY is not configured', HttpStatus.SERVICE_UNAVAILABLE);
    }
    return this.getGoogle()('gemini-2.5-flash');
  }

  getTools() {
    return {
      getUserBankStatement: createGetUserBankStatementTool(this.prismaService),
    };
  }

  getToolsForUser(userId: string) {
    return {
      getUserBankStatement: createGetUserBankStatementTool(this.prismaService, userId),
      listUserAccounts: createListUserAccountsTool(this.prismaService, userId),
      getRecentTransactions: createGetRecentTransactionsTool(this.prismaService, userId),
      getAccountBalance: createGetAccountBalanceTool(this.prismaService, userId),
    };
  }

  async chatReply(userId: string, message: string): Promise<string> {
    const result = await this.generateText({
      prompt: message,
      systemPrompt: CHAT_ASSISTANT_SYSTEM_PROMPT,
      tools: true,
      maxSteps: 5,
      toolsOverride: this.getToolsForUser(userId),
    });
    return result.text ?? '';
  }

  /** Chat reply with full conversation history for context (multi-turn). Uses current date context so "this month" etc. are inferred. */
  async chatReplyWithHistory(
    userId: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  ): Promise<string> {
    const result = await this.generateTextWithMessages({
      messages,
      systemPrompt: getChatAssistantSystemPromptWithContext(),
      tools: true,
      maxSteps: 5,
      toolsOverride: this.getToolsForUser(userId),
    });
    return result.text ?? '';
  }

  async generateText(options: {
    prompt: string;
    systemPrompt?: string;
    tools?: boolean;
    maxSteps?: number;
    toolsOverride?: ReturnType<AiService['getToolsForUser']>;
  }) {
    const {
      prompt,
      systemPrompt = BANKING_SYSTEM_PROMPT,
      tools: useTools = false,
      maxSteps = 5,
      toolsOverride,
    } = options;
    const model = this.getModel();
    const toolsRaw = useTools ? (toolsOverride ?? this.getTools()) : undefined;
    const tools = toolsRaw as Parameters<typeof generateText>[0]['tools'];

    const result = await generateText({
      model,
      system: systemPrompt,
      prompt,
      tools,
      ...(useTools && { stopWhen: stepCountIs(maxSteps) }),
    });

    return {
      text: result.text,
      usage: result.usage,
      steps: result.steps,
      toolCalls: result.toolCalls,
      toolResults: result.toolResults,
    };
  }

  private async generateTextWithMessages(options: {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    systemPrompt?: string;
    tools?: boolean;
    maxSteps?: number;
    toolsOverride?: ReturnType<AiService['getToolsForUser']>;
  }) {
    const {
      messages,
      systemPrompt = BANKING_SYSTEM_PROMPT,
      tools: useTools = false,
      maxSteps = 5,
      toolsOverride,
    } = options;
    const model = this.getModel();
    const toolsRaw = useTools ? (toolsOverride ?? this.getTools()) : undefined;
    const tools = toolsRaw as Parameters<typeof generateText>[0]['tools'];

    const result = await generateText({
      model,
      system: systemPrompt,
      messages: messages as ModelMessage[],
      tools,
      ...(useTools && { stopWhen: stepCountIs(maxSteps) }),
    });

    return {
      text: result.text,
      usage: result.usage,
      steps: result.steps,
      toolCalls: result.toolCalls,
      toolResults: result.toolResults,
    };
  }

  streamText(options: {
    prompt: string;
    systemPrompt?: string;
    tools?: boolean;
    maxSteps?: number;
    onChunk?: (chunk: { text?: string }) => void;
    onError?: (error: unknown) => void;
  }): AIStreamTextResult {
    const {
      prompt,
      systemPrompt = BANKING_SYSTEM_PROMPT,
      tools: useTools = false,
      maxSteps = 5,
      onChunk,
      onError,
    } = options;
    const model = this.getModel();
    const tools = useTools ? this.getTools() : undefined;

    const result = streamText({
      model,
      system: systemPrompt,
      prompt,
      tools,
      ...(useTools && { stopWhen: stepCountIs(maxSteps) }),
      onChunk: onChunk
        ? ({ chunk }) => {
            if (chunk.type === 'text-delta') onChunk({ text: chunk.text });
          }
        : undefined,
      onError: onError ? ({ error }) => onError(error) : undefined,
    });
    return { textStream: result.textStream };
  }

  async generateStructuredOutput<T>(options: {
    prompt: string;
    systemPrompt?: string;
    schema: z.ZodType<T>;
    outputName?: string;
    outputDescription?: string;
  }) {
    const { prompt, systemPrompt = BANKING_SYSTEM_PROMPT, schema, outputName, outputDescription } = options;
    const model = this.getModel();

    const result = await generateText({
      model,
      system: systemPrompt,
      prompt,
      output: Output.object({
        ...(outputName && { name: outputName }),
        ...(outputDescription && { description: outputDescription }),
        schema,
      }),
    });

    return result.output as T;
  }

  async analyzeBankStatement(
    user: User,
    accountId: string | undefined,
    startDate: Date,
    endDate: Date,
  ): Promise<BankStatementAnalysis> {
    const account = accountId
      ? await this.prismaService.account.findFirst({
          where: { id: accountId, userId: user.id, closedAt: null },
          select: { id: true, accountNumber: true, accountType: true, balance: true, currency: true },
        })
      : await this.prismaService.account.findFirst({
          where: { userId: user.id, closedAt: null },
          select: { id: true, accountNumber: true, accountType: true, balance: true, currency: true },
        });

    if (!account) {
      throw throwError('Account not found or does not belong to user', HttpStatus.NOT_FOUND);
    }

    const transactions = await this.prismaService.transaction.findMany({
      where: {
        accountId: account.id,
        createdAt: { gte: startDate, lte: endDate },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        type: true,
        category: true,
        amount: true,
        balanceAfter: true,
        currency: true,
        description: true,
        merchant: true,
        createdAt: true,
      },
    });

    const openingBalance =
      transactions.length > 0
        ? Number(transactions[0].balanceAfter) - Number(transactions[0].amount)
        : Number(account.balance);
    const closingBalance = Number(account.balance);
    const totalDeposits = transactions
      .filter((t) => ['DEPOSIT', 'REFUND', 'INTEREST'].includes(t.type))
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const totalWithdrawals = transactions
      .filter((t) => ['WITHDRAWAL', 'PAYMENT', 'FEE', 'TRANSFER'].includes(t.type))
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

    const statementContext = {
      account: {
        accountNumber: account.accountNumber,
        accountType: account.accountType,
        balance: Number(account.balance),
        currency: account.currency,
      },
      period: {
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
      },
      summary: {
        openingBalance,
        closingBalance,
        totalDeposits,
        totalWithdrawals,
        transactionCount: transactions.length,
      },
      transactions: transactions.map((t) => ({
        type: t.type,
        category: t.category,
        amount: Number(t.amount),
        currency: t.currency,
        description: t.description,
        merchant: t.merchant,
        date: t.createdAt.toISOString().slice(0, 10),
      })),
    };

    const prompt = `${BANK_STATEMENT_ANALYZER_PROMPT}\n\nStatement data (JSON):\n${JSON.stringify(statementContext, null, 2)}`;

    const model = this.getModel();
    const result = await generateText({
      model,
      system: BANKING_SYSTEM_PROMPT,
      prompt,
      output: Output.object({
        name: 'BankStatementAnalysis',
        description: 'Structured analysis of a bank statement with summary, feedback, and improvement hints',
        schema: BankStatementAnalysisSchema,
      }),
    });

    const output = result.output as BankStatementAnalysis;
    if (!output || !output.summary || !output.improvementHints) {
      this.logger.warn('AI returned incomplete analysis', AiService.name);
      throw throwError('Analysis could not be generated', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return output;
  }
}
