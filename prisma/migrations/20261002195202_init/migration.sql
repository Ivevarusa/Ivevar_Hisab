-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ACCOUNTS', 'SALES', 'DISPATCH', 'MARKETING');

-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('EMPLOYEE', 'WEBSITE', 'ETSY', 'OTHER');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('ENQUIRY', 'CONFIRMED', 'IN_PRODUCTION', 'READY', 'DISPATCHED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentKind" AS ENUM ('DEPOSIT', 'BALANCE', 'FULL', 'REFUND');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CASH', 'BANK', 'GATEWAY', 'WALLET');

-- CreateEnum
CREATE TYPE "SupplierType" AS ENUM ('MANUFACTURER', 'COURIER', 'VENDOR');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'RETURNED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'SALES',
    "commissionPct" DECIMAL(5,2) NOT NULL DEFAULT 25,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "country" TEXT,
    "birthday" DATE,
    "gender" TEXT,
    "source" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrder" (
    "id" TEXT NOT NULL,
    "orderNo" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "customerId" TEXT NOT NULL,
    "salesExecId" TEXT,
    "source" "OrderSource" NOT NULL DEFAULT 'EMPLOYEE',
    "websiteOrderId" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'CONFIRMED',
    "totalUsd" DECIMAL(12,2) NOT NULL,
    "usdInrRate" DECIMAL(10,4) NOT NULL,
    "priority" TEXT,
    "requiredBy" DATE,
    "isGift" BOOLEAN NOT NULL DEFAULT false,
    "engraving" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "metal" TEXT,
    "stone" TEXT,
    "specs" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "priceUsd" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "openingBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentIn" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "orderId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "kind" "PaymentKind" NOT NULL DEFAULT 'FULL',
    "method" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "rateToInr" DECIMAL(10,4) NOT NULL,
    "amountInr" DECIMAL(14,2) NOT NULL,
    "confirmedById" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SupplierType" NOT NULL DEFAULT 'MANUFACTURER',
    "phone" TEXT,
    "gstNo" TEXT,
    "bankInfo" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "supplierId" TEXT NOT NULL,
    "orderId" TEXT,
    "description" TEXT NOT NULL,
    "billNo" TEXT,
    "amountInr" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentOut" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "supplierId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "method" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "rateToInr" DECIMAL(10,4) NOT NULL DEFAULT 1,
    "amountInr" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentOut_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "paidTo" TEXT,
    "accountId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "rateToInr" DECIMAL(10,4) NOT NULL DEFAULT 1,
    "amountInr" DECIMAL(14,2) NOT NULL,
    "employeeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transfer" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "fromAccountId" TEXT NOT NULL,
    "toAccountId" TEXT NOT NULL,
    "amountFrom" DECIMAL(14,2) NOT NULL,
    "amountTo" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "courier" TEXT NOT NULL,
    "supplierId" TEXT,
    "trackingNo" TEXT,
    "dispatchDate" DATE NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'DISPATCHED',
    "trackingSent" BOOLEAN NOT NULL DEFAULT false,
    "costInr" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_orderNo_key" ON "SalesOrder"("orderNo");

-- CreateIndex
CREATE INDEX "SalesOrder_date_idx" ON "SalesOrder"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Account_name_key" ON "Account"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_name_key" ON "Supplier"("name");

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_salesExecId_fkey" FOREIGN KEY ("salesExecId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentIn" ADD CONSTRAINT "PaymentIn_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SalesOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentIn" ADD CONSTRAINT "PaymentIn_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentIn" ADD CONSTRAINT "PaymentIn_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SalesOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOut" ADD CONSTRAINT "PaymentOut_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOut" ADD CONSTRAINT "PaymentOut_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
