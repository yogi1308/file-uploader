/*
  Warnings:

  - Added the required column `size` to the `files` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "files" DROP CONSTRAINT "files_userId_fkey";

-- DropIndex
DROP INDEX "files_name_key";

-- DropIndex
DROP INDEX "files_userId_key";

-- AlterTable
ALTER TABLE "files" ADD COLUMN     "size" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
