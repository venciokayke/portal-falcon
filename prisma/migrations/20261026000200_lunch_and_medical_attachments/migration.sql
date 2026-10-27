-- Campos opcionais: nenhum intervalo ou anexo e presumido para registros antigos.
BEGIN;
ALTER TABLE "shifts" ADD COLUMN IF NOT EXISTS "breakStart" TIMESTAMP(3);
ALTER TABLE "shifts" ADD COLUMN IF NOT EXISTS "breakEnd" TIMESTAMP(3);
ALTER TABLE "overtime_entries" ADD COLUMN IF NOT EXISTS "intervalValue" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "absence_exemptions" ADD COLUMN IF NOT EXISTS "attachmentName" TEXT;
ALTER TABLE "absence_exemptions" ADD COLUMN IF NOT EXISTS "attachmentMime" TEXT;
ALTER TABLE "absence_exemptions" ADD COLUMN IF NOT EXISTS "attachmentData" BYTEA;
ALTER TABLE "absence_exemptions" ADD COLUMN IF NOT EXISTS "uploadedById" UUID;

CREATE INDEX IF NOT EXISTS "shifts_employeeId_referenceDate_idx" ON "shifts"("employeeId", "referenceDate");
CREATE INDEX IF NOT EXISTS "absence_exemptions_employeeId_startDate_endDate_idx" ON "absence_exemptions"("employeeId", "startDate", "endDate");

ALTER TABLE "shifts" ADD CONSTRAINT "shifts_break_pair_order"
  CHECK ("breakStart" IS NULL OR "breakEnd" IS NULL OR "breakEnd" > "breakStart");
ALTER TABLE "absence_exemptions" ADD CONSTRAINT "absence_attachment_size"
  CHECK ("attachmentData" IS NULL OR octet_length("attachmentData") BETWEEN 1 AND 5242880);
COMMIT;
