-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "contact_email" TEXT,
ADD COLUMN     "contact_phone" TEXT,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'MXN',
ADD COLUMN     "last_payment_at" TIMESTAMP(3),
ADD COLUMN     "max_leads" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "max_properties" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "monthly_rate" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "plan" TEXT NOT NULL DEFAULT 'trial',
ADD COLUMN     "plan_status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "trial_ends_at" TIMESTAMP(3);
