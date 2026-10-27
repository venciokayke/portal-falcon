-- Reconcilia recursos presentes no schema, mas ausentes do historico de migracoes.
-- Apenas adicoes; preserva instalacoes que receberam esses campos via db push.
BEGIN;
ALTER TABLE "system_users" ADD COLUMN IF NOT EXISTS "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "shifts" ADD COLUMN IF NOT EXISTS "hasIntervalHour" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "shifts" ADD COLUMN IF NOT EXISTS "observations" TEXT;
ALTER TABLE "overtime_entries" ADD COLUMN IF NOT EXISTS "extraValue" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "overtime_entries" ADD COLUMN IF NOT EXISTS "approvedById" UUID;
ALTER TABLE "overtime_entries" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);


CREATE TABLE IF NOT EXISTS "absence_exemptions" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "absence_exemptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "payroll_statuses" (
    "id" UUID NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'EM_DIGITACAO',
    "sentAt" TIMESTAMP(3),
    "sentById" UUID,
    "approvedAt" TIMESTAMP(3),
    "approvedById" UUID,

    CONSTRAINT "payroll_statuses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "work_locations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_locations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "employee_month_parities" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "startParity" "StartParity" NOT NULL,

    CONSTRAINT "employee_month_parities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "accounting_report_entries" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "atestado" TEXT,
    "faltas" TEXT,
    "descontos" TEXT,
    "intervalarValue" TEXT,

    CONSTRAINT "accounting_report_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "benefits_report_entries" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "vaUnid" TEXT,
    "vaValue" TEXT,
    "vtUnid" TEXT,
    "vtValue" TEXT,

    CONSTRAINT "benefits_report_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "monthly_report_configs" (
    "id" UUID NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "vaRate" DECIMAL(10,2) NOT NULL,
    "vtRate" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "monthly_report_configs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "activity_logs" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "monthly_payrolls_employeeId_month_year_key" ON "monthly_payrolls"("employeeId", "month", "year");

CREATE UNIQUE INDEX IF NOT EXISTS "system_users_username_key" ON "system_users"("username");

CREATE UNIQUE INDEX IF NOT EXISTS "overtime_entries_employeeId_month_year_key" ON "overtime_entries"("employeeId", "month", "year");

CREATE UNIQUE INDEX IF NOT EXISTS "payroll_statuses_month_year_key" ON "payroll_statuses"("month", "year");

CREATE UNIQUE INDEX IF NOT EXISTS "work_locations_name_key" ON "work_locations"("name");

CREATE UNIQUE INDEX IF NOT EXISTS "employee_month_parities_employeeId_month_year_key" ON "employee_month_parities"("employeeId", "month", "year");

CREATE UNIQUE INDEX IF NOT EXISTS "accounting_report_entries_employeeId_month_year_key" ON "accounting_report_entries"("employeeId", "month", "year");

CREATE UNIQUE INDEX IF NOT EXISTS "benefits_report_entries_employeeId_month_year_key" ON "benefits_report_entries"("employeeId", "month", "year");

CREATE UNIQUE INDEX IF NOT EXISTS "monthly_report_configs_month_year_key" ON "monthly_report_configs"("month", "year");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shifts_employeeId_fkey' AND conrelid = 'shifts'::regclass) THEN
    ALTER TABLE "shifts" ADD CONSTRAINT "shifts_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_receipts_employeeId_fkey' AND conrelid = 'payroll_receipts'::regclass) THEN
    ALTER TABLE "payroll_receipts" ADD CONSTRAINT "payroll_receipts_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'monthly_payrolls_employeeId_fkey' AND conrelid = 'monthly_payrolls'::regclass) THEN
    ALTER TABLE "monthly_payrolls" ADD CONSTRAINT "monthly_payrolls_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'monthly_payrolls_approvedById_fkey' AND conrelid = 'monthly_payrolls'::regclass) THEN
    ALTER TABLE "monthly_payrolls" ADD CONSTRAINT "monthly_payrolls_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "system_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'overtime_entries_employeeId_fkey' AND conrelid = 'overtime_entries'::regclass) THEN
    ALTER TABLE "overtime_entries" ADD CONSTRAINT "overtime_entries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'overtime_entries_approvedById_fkey' AND conrelid = 'overtime_entries'::regclass) THEN
    ALTER TABLE "overtime_entries" ADD CONSTRAINT "overtime_entries_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "system_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'absence_exemptions_employeeId_fkey' AND conrelid = 'absence_exemptions'::regclass) THEN
    ALTER TABLE "absence_exemptions" ADD CONSTRAINT "absence_exemptions_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_statuses_sentById_fkey' AND conrelid = 'payroll_statuses'::regclass) THEN
    ALTER TABLE "payroll_statuses" ADD CONSTRAINT "payroll_statuses_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "system_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_statuses_approvedById_fkey' AND conrelid = 'payroll_statuses'::regclass) THEN
    ALTER TABLE "payroll_statuses" ADD CONSTRAINT "payroll_statuses_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "system_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_month_parities_employeeId_fkey' AND conrelid = 'employee_month_parities'::regclass) THEN
    ALTER TABLE "employee_month_parities" ADD CONSTRAINT "employee_month_parities_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'accounting_report_entries_employeeId_fkey' AND conrelid = 'accounting_report_entries'::regclass) THEN
    ALTER TABLE "accounting_report_entries" ADD CONSTRAINT "accounting_report_entries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'benefits_report_entries_employeeId_fkey' AND conrelid = 'benefits_report_entries'::regclass) THEN
    ALTER TABLE "benefits_report_entries" ADD CONSTRAINT "benefits_report_entries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'activity_logs_userId_fkey' AND conrelid = 'activity_logs'::regclass) THEN
    ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "system_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
