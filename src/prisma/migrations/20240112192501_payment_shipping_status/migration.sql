/*
  Warnings:

  - You are about to drop the column `status` on the `Order` table. All the data in the column will be lost.
  - Added the required column `paymentStatus` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shippingStatus` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('payment_pending', 'payment_received', 'payment_refunded');

-- CreateEnum
CREATE TYPE "ShippingStatus" AS ENUM ('processing', 'shipping', 'delivered', 'cancelled');

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "status",
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL,
ADD COLUMN     "shippingStatus" "ShippingStatus" NOT NULL;

-- DropEnum
DROP TYPE "OrderStatus";
