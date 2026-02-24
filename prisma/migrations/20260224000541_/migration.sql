-- AlterTable
ALTER TABLE "Client" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ReminderSchedule" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Service" ALTER COLUMN "updatedAt" DROP DEFAULT;
