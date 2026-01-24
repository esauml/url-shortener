-- CreateTable
CREATE TABLE "short_urls" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "short_urls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "short_urls_code_key" ON "short_urls"("code");

-- CreateIndex
CREATE INDEX "short_urls_code_idx" ON "short_urls"("code");
