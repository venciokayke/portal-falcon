/*
  Warnings:

  - You are about to drop the column `extraHoursTotalValue` on the `payroll_receipts` table. All the data in the column will be lost.
  - You are about to drop the column `finalAmount` on the `payroll_receipts` table. All the data in the column will be lost.
  - You are about to drop the column `manualAdditions` on the `payroll_receipts` table. All the data in the column will be lost.
  - You are about to drop the column `manualDeductions` on the `payroll_receipts` table. All the data in the column will be lost.
  - You are about to drop the column `netSalaryAccounting` on the `payroll_receipts` table. All the data in the column will be lost.
  - You are about to drop the column `vaTotal` on the `payroll_receipts` table. All the data in the column will be lost.
  - You are about to drop the column `vtTotal` on the `payroll_receipts` table. All the data in the column will be lost.
  - Added the required column `contraCheque` to the `payroll_receipts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `descontos` to the `payroll_receipts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total` to the `payroll_receipts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `valeTransporte` to the `payroll_receipts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `valoresExtras` to the `payroll_receipts` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'USER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ContractType" ADD VALUE 'PJ_FIXO';
ALTER TYPE "ContractType" ADD VALUE 'PJ_HORISTA';

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "bankAccount" TEXT,
ADD COLUMN     "bankAgency" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "baseSalary" DECIMAL(10,2),
ADD COLUMN     "document" TEXT,
ADD COLUMN     "paymentMethod" TEXT DEFAULT 'PIX',
ALTER COLUMN "hourlyRate" DROP NOT NULL;

-- AlterTable
ALTER TABLE "payroll_receipts" DROP COLUMN "extraHoursTotalValue",
DROP COLUMN "finalAmount",
DROP COLUMN "manualAdditions",
DROP COLUMN "manualDeductions",
DROP COLUMN "netSalaryAccounting",
DROP COLUMN "vaTotal",
DROP COLUMN "vtTotal",
ADD COLUMN     "contraCheque" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "descontos" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "observacoes" TEXT,
ADD COLUMN     "total" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "valeTransporte" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "valoresExtras" DECIMAL(10,2) NOT NULL;

-- AlterTable
ALTER TABLE "shifts" ALTER COLUMN "checkIn" DROP NOT NULL,
ALTER COLUMN "checkOut" DROP NOT NULL;

-- CreateTable
CREATE TABLE "monthly_payrolls" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "baseValue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "extras" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "vtValue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discounts" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "observations" TEXT,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "approvedById" UUID,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_payrolls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "overtime_entries" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "hours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalValue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "observations" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "overtime_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "monthly_payrolls_employeeId_month_year_key" ON "monthly_payrolls"("employeeId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "system_users_username_key" ON "system_users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "overtime_entries_employeeId_month_year_key" ON "overtime_entries"("employeeId", "month", "year");

-- AddForeignKey
ALTER TABLE "monthly_payrolls" ADD CONSTRAINT "monthly_payrolls_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_payrolls" ADD CONSTRAINT "monthly_payrolls_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "system_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_entries" ADD CONSTRAINT "overtime_entries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
