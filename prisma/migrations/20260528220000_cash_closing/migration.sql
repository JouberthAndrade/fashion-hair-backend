-- CreateEnum
CREATE TYPE "CashClosingPeriod" AS ENUM ('DAY', 'WEEK', 'MONTH');

-- AlterTable
ALTER TABLE "services" ADD COLUMN "salon_fee_rate_percent" DECIMAL(5,2);

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN "price_at_booking" DECIMAL(10,2);
ALTER TABLE "appointments" ADD COLUMN "salon_fee_rate_at_booking" DECIMAL(5,2);
ALTER TABLE "appointments" ADD COLUMN "completed_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "appointments_status_scheduled_date_idx" ON "appointments"("status", "scheduled_date");

-- CreateTable
CREATE TABLE "salon_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "default_salon_fee_rate_percent" DECIMAL(5,2) NOT NULL DEFAULT 40,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by_id" TEXT,

    CONSTRAINT "salon_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_closings" (
    "id" TEXT NOT NULL,
    "period" "CashClosingPeriod" NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "total_gross" DECIMAL(12,2) NOT NULL,
    "total_salon_share" DECIMAL(12,2) NOT NULL,
    "total_collaborator_share" DECIMAL(12,2) NOT NULL,
    "appointment_count" INTEGER NOT NULL,
    "notes" TEXT,
    "closed_by_id" TEXT NOT NULL,
    "closed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_closings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cash_closings_period_start_period_end_idx" ON "cash_closings"("period_start", "period_end");

-- CreateIndex
CREATE UNIQUE INDEX "cash_closings_period_period_start_period_end_key" ON "cash_closings"("period", "period_start", "period_end");

-- AddForeignKey
ALTER TABLE "cash_closings" ADD CONSTRAINT "cash_closings_closed_by_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
