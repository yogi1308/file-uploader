/*
  Warnings:

  - Added the required column `location` to the `files` table without a default value. This is not possible if the table is not empty.
  - Added the required column `location` to the `folder` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "files" ADD COLUMN     "location" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "folder" ADD COLUMN     "location" TEXT NOT NULL;
