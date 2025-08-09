-- AlterTable
ALTER TABLE "public"."Settings" ADD COLUMN     "googleMonthsAfter" INTEGER,
ADD COLUMN     "googleMonthsBefore" INTEGER,
ADD COLUMN     "jiraSelectedDashboardIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "jiraSelectedProjectKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "microsoftMonthsAfter" INTEGER,
ADD COLUMN     "microsoftMonthsBefore" INTEGER;
