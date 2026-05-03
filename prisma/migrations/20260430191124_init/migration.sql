-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('CLT', 'HORISTA');

-- CreateEnum
CREATE TYPE "WorkSchedule" AS ENUM ('SCALE_12X36', 'FIXED_220', 'CUSTOM');

-- CreateEnum
CREATE TYPE "StartParity" AS ENUM ('PAR', 'IMPAR', 'NONE');

-- CreateTable
CREATE TABLE "employees" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "contractType" "ContractType" NOT NULL,
    "workSchedule" "WorkSchedule" NOT NULL,
    "startParity" "StartParity" NOT NULL,
    "hourlyRate" DECIMAL(10,2) NOT NULL,
    "pixKey" TEXT,
    "pixType" TEXT,
    "receivesVA" BOOLEAN NOT NULL DEFAULT false,
    "receivesVT" BOOLEAN NOT NULL DEFAULT false,
    "receivesIntervalHour" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "referenceDate" DATE NOT NULL,
    "location" TEXT NOT NULL,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_receipts" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "netSalaryAccounting" DECIMAL(10,2) NOT NULL,
    "extraHoursTotalValue" DECIMAL(10,2) NOT NULL,
    "vaTotal" DECIMAL(10,2) NOT NULL,
    "vtTotal" DECIMAL(10,2) NOT NULL,
    "manualAdditions" DECIMAL(10,2) NOT NULL,
    "manualDeductions" DECIMAL(10,2) NOT NULL,
    "finalAmount" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "payroll_receipts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_receipts" ADD CONSTRAINT "payroll_receipts_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
