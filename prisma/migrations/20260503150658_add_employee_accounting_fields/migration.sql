-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "receivesNightHazard" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "standardHours" TEXT,
ADD COLUMN     "workLocation" TEXT;
