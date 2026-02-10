---
title: Account Management Feature
status: draft
created: 2026-02-10
---

# Account Management Feature Specification

## Overview
Implement a comprehensive account management system for a banking application that allows users to manage their bank accounts, view balances, transaction history, and perform quick actions.

## Requirements

### 1. Account Types
- **Current Account** - Standard checking account
- **Savings Account** - Interest-bearing savings account
- **Credit Card** - Credit card account with credit limit

### 2. Core Features

#### Account Dashboard
- Display all user accounts with balances
- Show account summary overview (total balance across all accounts)
- Quick actions: transfer money, pay bills, add new account
- Recent transactions preview (last 5 transactions)

#### Account Details
- Full transaction history with pagination
- Account statements (view/download PDF)
- Account information: account number, IBAN, routing number
- Account status and type
- For credit cards: credit limit, available credit, due date

#### Transactions
- Transaction list with filters (date range, type, amount)
- Transaction details (merchant, category, status)
- Search transactions
- Export transactions (CSV/PDF)

### 3. Account Operations
- Create new account
- View account details
- Update account settings (nickname, alerts)
- Close/deactivate account (soft delete)
- Transfer between accounts

## Database Schema Design

### Account Model
```prisma
enum AccountType {
  CURRENT
  SAVINGS
  CREDIT_CARD
}

enum AccountStatus {
  ACTIVE
  INACTIVE
  FROZEN
  CLOSED
}

model Account {
  id            String        @id @default(uuid()) @db.Uuid
  userId        String        @db.Uuid
  accountNumber String        @unique
  iban          String?       @unique
  routingNumber String?
  
  accountType   AccountType
  accountStatus AccountStatus @default(ACTIVE)
  
  balance       Decimal       @default(0) @db.Decimal(15, 2)
  currency      String        @default("USD")
  
  // Credit Card specific
  creditLimit   Decimal?      @db.Decimal(15, 2)
  availableCredit Decimal?    @db.Decimal(15, 2)
  dueDate       DateTime?
  
  nickname      String?
  
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  closedAt      DateTime?
  
  user          User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions  Transaction[]
  
  @@index([userId])
  @@index([accountNumber])
  @@index([accountStatus])
}
```

### Transaction Model
```prisma
enum TransactionType {
  DEPOSIT
  WITHDRAWAL
  TRANSFER
  PAYMENT
  REFUND
  FEE
  INTEREST
}

enum TransactionStatus {
  PENDING
  COMPLETED
  FAILED
  CANCELLED
}

enum TransactionCategory {
  GROCERIES
  DINING
  TRANSPORTATION
  UTILITIES
  ENTERTAINMENT
  HEALTHCARE
  SHOPPING
  SALARY
  TRANSFER
  OTHER
}

model Transaction {
  id              String              @id @default(uuid()) @db.Uuid
  accountId       String              @db.Uuid
  
  type            TransactionType
  status          TransactionStatus   @default(PENDING)
  category        TransactionCategory @default(OTHER)
  
  amount          Decimal             @db.Decimal(15, 2)
  currency        String              @default("USD")
  
  balanceAfter    Decimal             @db.Decimal(15, 2)
  
  description     String
  merchant        String?
  reference       String?             @unique
  
  // For transfers
  toAccountId     String?             @db.Uuid
  fromAccountId   String?             @db.Uuid
  
  metadata        Json?
  
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt
  completedAt     DateTime?
  
  account         Account             @relation(fields: [accountId], references: [id], onDelete: Cascade)
  
  @@index([accountId])
  @@index([type])
  @@index([status])
  @@index([createdAt])
  @@index([reference])
}
```

### Update User Model
Add relation to User model:
```prisma
model User {
  // ... existing fields
  accounts Account[]
}
```

## API Endpoints

### Account Endpoints

#### 1. Create Account
- **POST** `/api/v1/account`
- **Auth**: Required (USER, ADMIN)
- **Body**: CreateAccountDto
- **Response**: Account details

#### 2. Get All User Accounts
- **GET** `/api/v1/account`
- **Auth**: Required (USER, ADMIN)
- **Query**: status filter
- **Response**: List of accounts with summary

#### 3. Get Account Dashboard
- **GET** `/api/v1/account/dashboard`
- **Auth**: Required (USER, ADMIN)
- **Response**: Dashboard data (all accounts, total balance, recent transactions)

#### 4. Get Account Details
- **GET** `/api/v1/account/:id`
- **Auth**: Required (USER, ADMIN)
- **Response**: Complete account details

#### 5. Update Account
- **PUT** `/api/v1/account/:id`
- **Auth**: Required (USER, ADMIN)
- **Body**: UpdateAccountDto
- **Response**: Updated account

#### 6. Close Account
- **DELETE** `/api/v1/account/:id`
- **Auth**: Required (USER, ADMIN)
- **Response**: Success message

#### 7. Get Account Statement
- **GET** `/api/v1/account/:id/statement`
- **Auth**: Required (USER, ADMIN)
- **Query**: startDate, endDate, format (pdf/json)
- **Response**: Statement data or PDF file

### Transaction Endpoints

#### 1. Get Account Transactions
- **GET** `/api/v1/account/:id/transactions`
- **Auth**: Required (USER, ADMIN)
- **Query**: page, limit, type, status, startDate, endDate, search
- **Response**: Paginated transactions

#### 2. Get Transaction Details
- **GET** `/api/v1/transaction/:id`
- **Auth**: Required (USER, ADMIN)
- **Response**: Transaction details

#### 3. Create Transaction (Internal Transfer)
- **POST** `/api/v1/transaction/transfer`
- **Auth**: Required (USER, ADMIN)
- **Body**: TransferDto
- **Response**: Transaction details

#### 4. Export Transactions
- **GET** `/api/v1/account/:id/transactions/export`
- **Auth**: Required (USER, ADMIN)
- **Query**: format (csv/pdf), startDate, endDate
- **Response**: File download

## DTOs

### CreateAccountDto
```typescript
{
  accountType: AccountType;
  nickname?: string;
  creditLimit?: number; // Required for CREDIT_CARD
}
```

### UpdateAccountDto
```typescript
{
  nickname?: string;
  accountStatus?: AccountStatus;
}
```

### TransferDto
```typescript
{
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description: string;
}
```

### GetTransactionsQueryDto
```typescript
{
  page?: number;
  limit?: number;
  type?: TransactionType;
  status?: TransactionStatus;
  category?: TransactionCategory;
  startDate?: string;
  endDate?: string;
  search?: string;
}
```

## Implementation Tasks

### Phase 1: Database Setup
- [ ] Add Account and Transaction models to Prisma schema
- [ ] Update User model with accounts relation
- [ ] Generate Prisma client
- [ ] Run migrations

### Phase 2: Account Module
- [ ] Create account module structure (module, controller, service)
- [ ] Implement CreateAccountDto, UpdateAccountDto
- [ ] Implement account queries/selects
- [ ] Implement account types
- [ ] Create account service methods:
  - [ ] createAccount
  - [ ] getAllUserAccounts
  - [ ] getAccountDashboard
  - [ ] getAccountById
  - [ ] updateAccount
  - [ ] closeAccount
  - [ ] generateAccountNumber
  - [ ] generateIBAN
- [ ] Create account controller endpoints
- [ ] Add Swagger documentation
- [ ] Add validation and error handling
- [ ] Implement Redis caching for dashboard and account details

### Phase 3: Transaction Module
- [ ] Create transaction module structure (module, controller, service)
- [ ] Implement TransferDto, GetTransactionsQueryDto
- [ ] Implement transaction queries/selects
- [ ] Implement transaction types
- [ ] Create transaction service methods:
  - [ ] getAccountTransactions
  - [ ] getTransactionById
  - [ ] createTransfer
  - [ ] updateTransactionStatus
  - [ ] generateReference
- [ ] Create transaction controller endpoints
- [ ] Add Swagger documentation
- [ ] Add validation and error handling
- [ ] Implement pagination for transactions

### Phase 4: Statement Generation
- [ ] Install PDF generation library (pdfkit or puppeteer)
- [ ] Create statement service
- [ ] Implement PDF statement generation
- [ ] Implement CSV export
- [ ] Add statement endpoint

### Phase 5: Integration
- [ ] Register modules in app.module
- [ ] Add account guards and authorization
- [ ] Test all endpoints
- [ ] Add Redis caching where appropriate
- [ ] Verify Swagger documentation

## Technical Notes

### Account Number Generation
- Format: 10-digit number
- Prefix based on account type (1=CURRENT, 2=SAVINGS, 3=CREDIT_CARD)
- Example: 1234567890

### IBAN Generation
- Format: Country code (2) + Check digits (2) + Bank code (4) + Account number (10)
- Example: US12BANK1234567890

### Transaction Reference
- Format: TXN-{timestamp}-{random}
- Example: TXN-1707598800-A1B2C3

### Balance Calculation
- Update account balance after each transaction
- Store balanceAfter in transaction for audit trail
- Use database transactions for consistency

### Security Considerations
- Verify account ownership before operations
- Validate sufficient balance for withdrawals/transfers
- Implement rate limiting for transfers
- Log all account operations
- Encrypt sensitive data

## Success Criteria
- Users can create and manage multiple accounts
- Dashboard displays accurate real-time balances
- Transaction history is complete and searchable
- Statements can be generated and downloaded
- All operations are secure and validated
- API is well-documented with Swagger
- Caching improves performance
- No tests required (as per requirements)
