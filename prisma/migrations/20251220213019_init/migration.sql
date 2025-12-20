/*
  Warnings:

  - Added the required column `date` to the `folder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `size` to the `folder` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "folder" ADD COLUMN     "date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "size" INTEGER NOT NULL;
