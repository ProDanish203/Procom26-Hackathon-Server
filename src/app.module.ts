import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { StorageModule } from './storage/storage.module';
import { UserModule } from './user/user.module';
import { MailerModule } from './mailer/mailer.module';
import { BullMQModule } from './common/modules/bullmq.module';
import { AccountModule } from './account/account.module';
import { TransactionModule } from './transaction/transaction.module';
import { BeneficiaryModule } from './beneficiary/beneficiary.module';
import { PaymentModule } from './payment/payment.module';
import { CardsModule } from './cards/cards.module';
import { ChatModule } from './chat/chat.module';
import { AiModule } from './ai/ai.module';
import { CurrencyModule } from './currency/currency.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullMQModule,
    AuthModule,
    StorageModule,
    UserModule,
    MailerModule,
    AccountModule,
    TransactionModule,
    BeneficiaryModule,
    PaymentModule,
    CardsModule,
    ChatModule,
    AiModule,
    CurrencyModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
