-- AlterTable
ALTER TABLE "folder" ADD COLUMN     "pinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "starred" BOOLEAN NOT NULL DEFAULT false;
