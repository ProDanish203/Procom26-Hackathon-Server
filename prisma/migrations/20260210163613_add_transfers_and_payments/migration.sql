-- CreateEnum
CREATE TYPE "BeneficiaryType" AS ENUM ('DESI_BANK', 'OTHER_BANK', 'RAAST', 'BILLER', 'MOBILE');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('INTERBANK_TRANSFER', 'IBFT_TRANSFER', 'RAAST_TRANSFER', 'UTILITY_BILL', 'TELECOM_BILL', 'CREDIT_CARD_PAYMENT', 'EDUCATION_FEE', 'TAX_PAYMENT', 'INSURANCE_PREMIUM', 'MOBILE_RECHARGE', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateTable
CREATE TABLE "Beneficiary" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "beneficiaryType" "BeneficiaryType" NOT NULL,
    "nickname" TEXT NOT NULL,
    "accountNumber" TEXT,
    "iban" TEXT,
    "bankName" TEXT,
    "accountTitle" TEXT,
    "consumerNumber" TEXT,
    "billerName" TEXT,
    "billerCategory" TEXT,
    "mobileNumber" TEXT,
    "mobileOperator" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Beneficiary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "beneficiaryId" UUID,
    "paymentType" "PaymentType" NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(15,2) NOT NULL,
    "fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PKR',
    "recipientName" TEXT NOT NULL,
    "recipientAccount" TEXT,
    "recipientIban" TEXT,
    "recipientBank" TEXT,
    "consumerNumber" TEXT,
    "billerName" TEXT,
    "billMonth" TEXT,
    "billAmount" DECIMAL(15,2),
    "dueDate" TIMESTAMP(3),
    "mobileNumber" TEXT,
    "mobileOperator" TEXT,
    "description" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "transactionId" TEXT,
    "receiptUrl" TEXT,
    "metadata" JSONB,
    "failureReason" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Beneficiary_userId_idx" ON "Beneficiary"("userId");

-- CreateIndex
CREATE INDEX "Beneficiary_beneficiaryType_idx" ON "Beneficiary"("beneficiaryType");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_reference_key" ON "Payment"("reference");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE INDEX "Payment_accountId_idx" ON "Payment"("accountId");

-- CreateIndex
CREATE INDEX "Payment_paymentType_idx" ON "Payment"("paymentType");

-- CreateIndex
CREATE INDEX "Payment_paymentStatus_idx" ON "Payment"("paymentStatus");

-- CreateIndex
CREATE INDEX "Payment_reference_idx" ON "Payment"("reference");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- AddForeignKey
ALTER TABLE "Beneficiary" ADD CONSTRAINT "Beneficiary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE SET NULL ON UPDATE CASCADE;
