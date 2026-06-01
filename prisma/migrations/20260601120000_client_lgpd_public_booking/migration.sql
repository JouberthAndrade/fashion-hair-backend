-- AlterTable: LGPD consent fields for public booking
ALTER TABLE "clients" ADD COLUMN "privacy_policy_version" VARCHAR(20),
ADD COLUMN "privacy_consented_at" TIMESTAMP(3),
ADD COLUMN "marketing_opt_in" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "booking_source" VARCHAR(30);
