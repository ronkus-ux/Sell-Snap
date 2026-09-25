-- AlterTable
ALTER TABLE "User" ADD COLUMN "onboarded" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "category" TEXT;
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "User" ADD COLUMN "businessDescription" TEXT;
