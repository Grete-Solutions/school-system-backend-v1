-- CreateTable
CREATE TABLE "Term" (
    "id" TEXT NOT NULL,
    "academic_year_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Term_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Term_academic_year_id_is_current_idx" ON "Term"("academic_year_id", "is_current");

-- CreateIndex
CREATE UNIQUE INDEX "Term_academic_year_id_name_key" ON "Term"("academic_year_id", "name");

-- AddForeignKey
ALTER TABLE "Term" ADD CONSTRAINT "Term_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;
