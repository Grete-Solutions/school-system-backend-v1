-- CreateTable
CREATE TABLE "DocumentPricing" (
    "id" TEXT NOT NULL,
    "school_id" TEXT,
    "document_type" TEXT NOT NULL,
    "price_amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "effective_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiry_date" TIMESTAMP(3),
    "description" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentPricing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentPricing_school_id_document_type_idx" ON "DocumentPricing"("school_id", "document_type");

-- CreateIndex
CREATE INDEX "DocumentPricing_document_type_is_active_idx" ON "DocumentPricing"("document_type", "is_active");

-- CreateIndex
CREATE INDEX "DocumentPricing_effective_date_expiry_date_idx" ON "DocumentPricing"("effective_date", "expiry_date");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentPricing_school_id_document_type_effective_date_key" ON "DocumentPricing"("school_id", "document_type", "effective_date");

-- AddForeignKey
ALTER TABLE "DocumentPricing" ADD CONSTRAINT "DocumentPricing_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentPricing" ADD CONSTRAINT "DocumentPricing_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
