/*
  Warnings:

  - You are about to drop the column `filters` on the `Report` table. All the data in the column will be lost.
  - Made the column `data` on table `Report` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Report" DROP COLUMN "filters",
ADD COLUMN     "parameters" JSONB,
ADD COLUMN     "school_id" TEXT,
ALTER COLUMN "status" SET DEFAULT 'completed',
ALTER COLUMN "data" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
