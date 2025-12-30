/*
  Warnings:

  - Added the required column `assetType` to the `shared` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "shared" ADD COLUMN     "assetType" TEXT NOT NULL;
