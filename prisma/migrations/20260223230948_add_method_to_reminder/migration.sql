/*
  Warnings:

  - Made the column `method` on table `Reminder` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Reminder" ALTER COLUMN "method" SET NOT NULL;
