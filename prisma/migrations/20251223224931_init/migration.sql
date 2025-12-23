/*
  Warnings:

  - You are about to drop the column `folderId` on the `files` table. All the data in the column will be lost.
  - You are about to drop the column `path` on the `folder` table. All the data in the column will be lost.
  - Added the required column `location` to the `folder` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "files" DROP CONSTRAINT "files_folderId_fkey";

-- AlterTable
ALTER TABLE "files" DROP COLUMN "folderId";

-- AlterTable
ALTER TABLE "folder" DROP COLUMN "path",
ADD COLUMN     "location" TEXT NOT NULL;
