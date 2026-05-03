-- CreateEnum
CREATE TYPE "RegistrationCompany" AS ENUM ('FALCON_SERVICE', 'FALCON_MONITORAMENTO', 'NAO_REGISTRADO');

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "registrationCompany" "RegistrationCompany" NOT NULL DEFAULT 'NAO_REGISTRADO';
