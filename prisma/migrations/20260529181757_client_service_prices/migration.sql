-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "price_set_by_id" TEXT,
ADD COLUMN     "standard_price_at_booking" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "client_service_prices" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_service_prices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_service_prices_client_id_idx" ON "client_service_prices"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "client_service_prices_client_id_service_id_key" ON "client_service_prices"("client_id", "service_id");

-- AddForeignKey
ALTER TABLE "client_service_prices" ADD CONSTRAINT "client_service_prices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_service_prices" ADD CONSTRAINT "client_service_prices_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_price_set_by_id_fkey" FOREIGN KEY ("price_set_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
