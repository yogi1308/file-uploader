-- CreateTable
CREATE TABLE "shared" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "shared_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "shared" ADD CONSTRAINT "shared_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
