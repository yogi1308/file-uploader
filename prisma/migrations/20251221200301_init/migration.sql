/*
  Warnings:

  - You are about to drop the column `public_id` on the `files` table. All the data in the column will be lost.
  - Added the required column `asset_id` to the `files` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "files" DROP COLUMN "public_id",
ADD COLUMN     "asset_id" TEXT NOT NULL;
