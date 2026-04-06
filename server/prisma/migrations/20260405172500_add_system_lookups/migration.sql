-- CreateTable
CREATE TABLE "system_lookups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_lookups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "idx_system_lookups_unique" ON "system_lookups"("category", "value");

-- CreateIndex
CREATE INDEX "idx_system_lookups_category" ON "system_lookups"("category", "is_active");

-- AlterTable
ALTER TABLE "surveys" ADD COLUMN "survey_type" TEXT;
