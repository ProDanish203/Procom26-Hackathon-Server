---
title: Transfers & Payments Feature
status: draft
created: 2026-02-10
bank: Desi Bank
---

# Transfers & Payments Feature Specification

## Overview
Implement a comprehensive transfers and payments system for Desi Bank that allows users to transfer funds, pay bills, recharge mobile, and manage beneficiaries.

## Requirements

### 1. Fund Transfers

#### Interbank Transfer (Within Desi Bank)
- Transfer between accounts within Desi Bank
- Instant processing
- No transfer fees
- Already implemented in Phase 1

#### IBFT (Interbank Fund Transfer)
- Transfer to other banks in Pakistan
- Uses account number and bank name
- Processing time: 1-2 business days
- Transfer fee: PKR 10-20

#### RAAST Transfer
- Pakistan's instant payment system
- Uses IBAN or RAAST ID
- Instant processing 24/7
- Lower fees than IBFT
- Transfer fee: PKR 0-5

### 2. Bill Payments

#### Utility Bills
- Electricity (K-Electric, LESCO, FESCO, etc.)
- Gas (SSGC, SNGPL)
- Water (KWSB, WASA)
- Internet (PTCL, Nayatel, StormFiber)

#### Telecom Bills
- Mobile postpaid bills
- Landline bills

#### Other Payments
- Credit card payments
- School/University fees
- Tax payments (FBR)
- Insurance premiums

#### Features
- Save billers for quick access
- View bill history
- Schedule recurring payments
- Payment reminders

### 3. Mobile Top-up/Recharge
- Jazz
- Telenor
- Zong
- Ufone
- Quick recharge for saved numbers
- Recharge history

### 4. Payment History & Receipts
- View all payment transactions
- Filter by type, date, status
- Download receipt (PDF)
- Print payment proof
- Share receipt via email

## Database Schema Design

### Beneficiary Model
```prisma
enum BeneficiaryType {
  DESI_BANK      // Within Desi Bank
  OTHER_BANK     // IBFT
  RAAST          // RAAST transfer
  BILLER         // Bill payment
  MOBILE         // Mobile recharge
}

model Beneficiary {
  id              String          @id @default(uuid()) @db.Uuid
  userId          String          @db.Uuid
  
  beneficiaryType BeneficiaryType
  nickname        String
  
  // For bank transfers
  accountNumber   String?
  iban            String?
  bankName        String?
  accountTitle    String?
  
  // For bill payments
  consumerNumber  String?
  billerName      String?
  billerCategory  String?
  
  // For mobile recharge
  mobileNumber    String?
  mobileOperator  String?
  
  isActive        Boolean         @default(true)
  isFavorite      Boolean         @default(false)
  
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  
  user            User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  payments        Payment[]
  
  @@index([userId])
  @@index([beneficiaryType])
}
```

### Payment Model
```prisma
enum PaymentType {
  INTERBANK_TRANSFER    // Within Desi Bank
  IBFT_TRANSFER        // To other banks
  RAAST_TRANSFER       // RAAST instant
  UTILITY_BILL         // Electricity, gas, water
  TELECOM_BILL         // Mobile, internet
  CREDIT_CARD_PAYMENT
  EDUCATION_FEE
  TAX_PAYMENT
  INSURANCE_PREMIUM
  MOBILE_RECHARGE
  OTHER
}

enum PaymentStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
  REFUNDED
}

model Payment {
  id              String        @id @default(uuid()) @db.Uuid
  userId          String        @db.Uuid
  accountId       String        @db.Uuid
  beneficiaryId   String?       @db.Uuid
  
  paymentType     PaymentType
  paymentStatus   PaymentStatus @default(PENDING)
  
  amount          Decimal       @db.Decimal(15, 2)
  fee             Decimal       @default(0) @db.Decimal(10, 2)
  totalAmount     Decimal       @db.Decimal(15, 2)
  currency        String        @default("PKR")
  
  // Recipient details
  recipientName   String
  recipientAccount String?
  recipientIban   String?
  recipientBank   String?
  
  // Bill payment details
  consumerNumber  String?
  billerName      String?
  billMonth       String?
  billAmount      Decimal?      @db.Decimal(15, 2)
  dueDate         DateTime?
  
  // Mobile recharge details
  mobileNumber    String?
  mobileOperator  String?
  
  description     String
  reference       String        @unique
  transactionId   String?       // External transaction ID
  
  // Receipt/Proof
  receiptUrl      String?
  
  metadata        Json?
  
  failureReason   String?
  
  scheduledAt     DateTime?
  processedAt     DateTime?
  completedAt     DateTime?
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  account         Account       @relation(fields: [accountId], references: [id], onDelete: Cascade)
  beneficiary     Beneficiary?  @relation(fields: [beneficiaryId], references: [id], onDelete: SetNull)
  
  @@index([userId])
  @@index([accountId])
  @@index([paymentType])
  @@index([paymentStatus])
  @@index([reference])
  @@index([createdAt])
}
```

### Update User Model
```prisma
model User {
  // ... existing fields
  beneficiaries Beneficiary[]
  payments      Payment[]
}
```

### Update Account Model
```prisma
model Account {
  // ... existing fields
  payments Payment[]
}
```

## API Endpoints

### Beneficiary Endpoints

#### 1. Add Beneficiary
- **POST** `/api/v1/beneficiary`
- **Auth**: Required (USER, ADMIN)
- **Body**: AddBeneficiaryDto
- **Response**: Beneficiary details

#### 2. Get All Beneficiaries
- **GET** `/api/v1/beneficiary`
- **Auth**: Required (USER, ADMIN)
- **Query**: type, isFavorite
- **Response**: List of beneficiaries

#### 3. Get Beneficiary Details
- **GET** `/api/v1/beneficiary/:id`
- **Auth**: Required (USER, ADMIN)
- **Response**: Beneficiary details

#### 4. Update Beneficiary
- **PUT** `/api/v1/beneficiary/:id`
- **Auth**: Required (USER, ADMIN)
- **Body**: UpdateBeneficiaryDto
- **Response**: Updated beneficiary

#### 5. Delete Beneficiary
- **DELETE** `/api/v1/beneficiary/:id`
- **Auth**: Required (USER, ADMIN)
- **Response**: Success message

#### 6. Toggle Favorite
- **PATCH** `/api/v1/beneficiary/:id/favorite`
- **Auth**: Required (USER, ADMIN)
- **Response**: Updated beneficiary

### Payment Endpoints

#### 1. Initiate IBFT Transfer
- **POST** `/api/v1/payment/ibft`
- **Auth**: Required (USER, ADMIN)
- **Body**: IBFTTransferDto
- **Response**: Payment details

#### 2. Initiate RAAST Transfer
- **POST** `/api/v1/payment/raast`
- **Auth**: Required (USER, ADMIN)
- **Body**: RAASTTransferDto
- **Response**: Payment details

#### 3. Pay Utility Bill
- **POST** `/api/v1/payment/bill`
- **Auth**: Required (USER, ADMIN)
- **Body**: BillPaymentDto
- **Response**: Payment details

#### 4. Mobile Recharge
- **POST** `/api/v1/payment/recharge`
- **Auth**: Required (USER, ADMIN)
- **Body**: MobileRechargeDto
- **Response**: Payment details

#### 5. Get Payment History
- **GET** `/api/v1/payment`
- **Auth**: Required (USER, ADMIN)
- **Query**: page, limit, type, status, startDate, endDate
- **Response**: Paginated payments

#### 6. Get Payment Details
- **GET** `/api/v1/payment/:id`
- **Auth**: Required (USER, ADMIN)
- **Response**: Payment details

#### 7. Download Receipt
- **GET** `/api/v1/payment/:id/receipt`
- **Auth**: Required (USER, ADMIN)
- **Query**: format (pdf/json)
- **Response**: Receipt file or JSON

#### 8. Verify Beneficiary (IBFT/RAAST)
- **POST** `/api/v1/payment/verify`
- **Auth**: Required (USER, ADMIN)
- **Body**: VerifyBeneficiaryDto
- **Response**: Account title and bank details

#### 9. Get Bill Details
- **POST** `/api/v1/payment/bill/fetch`
- **Auth**: Required (USER, ADMIN)
- **Body**: FetchBillDto
- **Response**: Bill amount and details

## DTOs

### AddBeneficiaryDto
```typescript
{
  beneficiaryType: BeneficiaryType;
  nickname: string;
  
  // For bank transfers
  accountNumber?: string;
  iban?: string;
  bankName?: string;
  accountTitle?: string;
  
  // For bill payments
  consumerNumber?: string;
  billerName?: string;
  billerCategory?: string;
  
  // For mobile recharge
  mobileNumber?: string;
  mobileOperator?: string;
}
```

### IBFTTransferDto
```typescript
{
  accountId: string;
  beneficiaryId?: string;
  recipientAccount: string;
  recipientBank: string;
  recipientName: string;
  amount: number;
  description: string;
}
```

### RAASTTransferDto
```typescript
{
  accountId: string;
  beneficiaryId?: string;
  recipientIban: string;
  recipientName: string;
  amount: number;
  description: string;
}
```

### BillPaymentDto
```typescript
{
  accountId: string;
  beneficiaryId?: string;
  billerName: string;
  consumerNumber: string;
  amount: number;
  billMonth?: string;
  dueDate?: string;
}
```

### MobileRechargeDto
```typescript
{
  accountId: string;
  mobileNumber: string;
  mobileOperator: string;
  amount: number;
}
```

## Implementation Tasks

### Phase 1: Database Setup
- [ ] Add Beneficiary and Payment models to Prisma schema
- [ ] Update User and Account models with relations
- [ ] Generate Prisma client
- [ ] Run migrations

### Phase 2: Beneficiary Module
- [ ] Create beneficiary module structure
- [ ] Implement AddBeneficiaryDto, UpdateBeneficiaryDto
- [ ] Implement beneficiary queries/selects
- [ ] Implement beneficiary types
- [ ] Create beneficiary service methods
- [ ] Create beneficiary controller endpoints
- [ ] Add Swagger documentation
- [ ] Add validation and error handling
- [ ] Implement Redis caching

### Phase 3: Payment Module
- [ ] Create payment module structure
- [ ] Implement payment DTOs (IBFT, RAAST, Bill, Recharge)
- [ ] Implement payment queries/selects
- [ ] Implement payment types
- [ ] Create payment service methods:
  - [ ] initiateIBFT
  - [ ] initiateRaast
  - [ ] payBill
  - [ ] mobileRecharge
  - [ ] getPaymentHistory
  - [ ] getPaymentById
  - [ ] generateReference
  - [ ] calculateFee
  - [ ] verifyBeneficiary
  - [ ] fetchBillDetails
- [ ] Create payment controller endpoints
- [ ] Add Swagger documentation
- [ ] Add validation and error handling
- [ ] Implement pagination

### Phase 4: Receipt Generation
- [ ] Create receipt service
- [ ] Implement PDF receipt generation
- [ ] Add receipt download endpoint
- [ ] Store receipt URLs

### Phase 5: Integration
- [ ] Register modules in app.module
- [ ] Add guards and authorization
- [ ] Test all endpoints
- [ ] Add Redis caching
- [ ] Verify Swagger documentation

## Technical Notes

### Payment Reference Generation
- Format: PAY-{timestamp}-{random}
- Example: PAY-1707598800-A1B2C3

### Fee Structure
- Interbank (Desi Bank): PKR 0
- IBFT: PKR 15
- RAAST: PKR 0
- Bill Payment: PKR 0
- Mobile Recharge: PKR 0

### Payment Processing
- Interbank: Instant
- IBFT: 1-2 business days (simulate with PROCESSING status)
- RAAST: Instant
- Bill Payment: Instant
- Mobile Recharge: Instant

### Validation Rules
- Minimum transfer amount: PKR 1
- Maximum transfer amount: PKR 1,000,000 per transaction
- Daily transfer limit: PKR 5,000,000
- Verify sufficient balance before payment
- Validate IBAN format for RAAST
- Validate mobile number format (03XXXXXXXXX)

### Security Considerations
- Verify account ownership
- Validate beneficiary belongs to user
- Check account status (must be ACTIVE)
- Log all payment attempts
- Implement rate limiting
- Encrypt sensitive data
- Transaction PIN/OTP verification (future enhancement)

## Success Criteria
- Users can add and manage beneficiaries
- Users can transfer funds via IBFT and RAAST
- Users can pay utility and telecom bills
- Users can recharge mobile numbers
- Payment history is complete and searchable
- Receipts can be downloaded
- All operations are secure and validated
- API is well-documented with Swagger
- Caching improves performance
- No tests required (as per requirements)
