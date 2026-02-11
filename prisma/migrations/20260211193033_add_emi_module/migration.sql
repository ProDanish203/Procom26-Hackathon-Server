-- CreateEnum
CREATE TYPE "EmiPlanStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "EmiInstallmentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE');

-- CreateTable
CREATE TABLE "EmiPlan" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "productName" TEXT,
    "principal" DECIMAL(15,2) NOT NULL,
    "interestRateAnnual" DECIMAL(5,2) NOT NULL,
    "tenureMonths" INTEGER NOT NULL,
    "emiAmount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PKR',
    "status" "EmiPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "nextDueDate" TIMESTAMP(3),
    "totalInterest" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmiPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmiInstallment" (
    "id" UUID NOT NULL,
    "emiPlanId" UUID NOT NULL,
    "installmentNumber" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "principalComponent" DECIMAL(15,2) NOT NULL,
    "interestComponent" DECIMAL(15,2) NOT NULL,
    "status" "EmiInstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "paymentId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmiInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmiPlan_userId_idx" ON "EmiPlan"("userId");

-- CreateIndex
CREATE INDEX "EmiPlan_accountId_idx" ON "EmiPlan"("accountId");

-- CreateIndex
CREATE INDEX "EmiPlan_status_idx" ON "EmiPlan"("status");

-- CreateIndex
CREATE INDEX "EmiPlan_nextDueDate_idx" ON "EmiPlan"("nextDueDate");

-- CreateIndex
CREATE UNIQUE INDEX "EmiInstallment_paymentId_key" ON "EmiInstallment"("paymentId");

-- CreateIndex
CREATE INDEX "EmiInstallment_emiPlanId_idx" ON "EmiInstallment"("emiPlanId");

-- CreateIndex
CREATE INDEX "EmiInstallment_dueDate_idx" ON "EmiInstallment"("dueDate");

-- CreateIndex
CREATE INDEX "EmiInstallment_status_idx" ON "EmiInstallment"("status");

-- AddForeignKey
ALTER TABLE "EmiPlan" ADD CONSTRAINT "EmiPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmiPlan" ADD CONSTRAINT "EmiPlan_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmiInstallment" ADD CONSTRAINT "EmiInstallment_emiPlanId_fkey" FOREIGN KEY ("emiPlanId") REFERENCES "EmiPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmiInstallment" ADD CONSTRAINT "EmiInstallment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
