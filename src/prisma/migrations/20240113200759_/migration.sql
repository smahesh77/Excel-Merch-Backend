/*
  Warnings:

  - The values [payment_timeout] on the enum `PaymentStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [cancelled] on the enum `ShippingStatus` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `orderStatus` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalAmountInRs` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('order_unconfirmed', 'order_confirmed', 'order_cancelled_by_user', 'order_cancelled_insufficient_stock');

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentStatus_new" AS ENUM ('payment_pending', 'payment_received', 'payment_refund_initiated', 'payment_refund_failed', 'payment_refunded');
ALTER TABLE "Order" ALTER COLUMN "paymentStatus" TYPE "PaymentStatus_new" USING ("paymentStatus"::text::"PaymentStatus_new");
ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";
ALTER TYPE "PaymentStatus_new" RENAME TO "PaymentStatus";
DROP TYPE "PaymentStatus_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "ShippingStatus_new" AS ENUM ('not_shipped', 'processing', 'shipping', 'delivered');
ALTER TABLE "Order" ALTER COLUMN "shippingStatus" TYPE "ShippingStatus_new" USING ("shippingStatus"::text::"ShippingStatus_new");
ALTER TYPE "ShippingStatus" RENAME TO "ShippingStatus_old";
ALTER TYPE "ShippingStatus_new" RENAME TO "ShippingStatus";
DROP TYPE "ShippingStatus_old";
COMMIT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "orderStatus" "OrderStatus" NOT NULL,
ADD COLUMN     "totalAmountInRs" DOUBLE PRECISION NOT NULL;

-- CreateTable
CREATE TABLE "AdditionalOrderCharges" (
    "id" SERIAL NOT NULL,
    "orderId" TEXT NOT NULL,
    "chargeType" TEXT NOT NULL,
    "chargeAmountInRs" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "AdditionalOrderCharges_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AdditionalOrderCharges" ADD CONSTRAINT "AdditionalOrderCharges_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("orderId") ON DELETE RESTRICT ON UPDATE CASCADE;
