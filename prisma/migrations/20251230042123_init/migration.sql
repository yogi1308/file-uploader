/*
  Warnings:

  - You are about to drop the column `token` on the `shared` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "shared" DROP COLUMN "token",
ALTER COLUMN "expires" DROP NOT NULL;
