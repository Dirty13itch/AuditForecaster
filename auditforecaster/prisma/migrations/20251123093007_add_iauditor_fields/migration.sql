-- AlterTable
ALTER TABLE "Inspection" ADD COLUMN     "answers" JSONB,
ADD COLUMN     "maxScore" DOUBLE PRECISION,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "score" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "ReportTemplate" ADD COLUMN     "description" TEXT,
ADD COLUMN     "scoring" JSONB,
ADD COLUMN     "structure" JSONB,
ALTER COLUMN "checklistItems" DROP NOT NULL;
