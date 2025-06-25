-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "code" TEXT,
    "duration" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Program_school_id_status_idx" ON "Program"("school_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Program_school_id_code_key" ON "Program"("school_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Program_school_id_name_key" ON "Program"("school_id", "name");

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
