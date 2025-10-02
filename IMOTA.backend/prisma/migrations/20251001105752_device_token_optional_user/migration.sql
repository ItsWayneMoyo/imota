/*
  Warnings:

  - A unique constraint covering the columns `[token]` on the table `DeviceToken` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "DeviceToken" DROP CONSTRAINT "DeviceToken_userId_fkey";

-- DropIndex
DROP INDEX "DeviceToken_platform_token_key";

-- AlterTable
ALTER TABLE "DeviceToken" ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "DeviceToken_token_key" ON "DeviceToken"("token");

-- AddForeignKey
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
