/*
  Warnings:

  - The primary key for the `CartItem` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `cartId` on the `CartItem` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `CartItem` table. All the data in the column will be lost.
  - You are about to drop the column `orderOrderId` on the `CartItem` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `CartItem` table. All the data in the column will be lost.
  - You are about to drop the column `cartId` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `amount` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `itemId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the `Cart` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `house` to the `Address` table without a default value. This is not possible if the table is not empty.
  - Added the required column `colorOption` to the `CartItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sizeOption` to the `CartItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `CartItem` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `MediaObject` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `colorOption` to the `OrderItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sizeOption` to the `OrderItem` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MediaTypes" AS ENUM ('image', 'video');

-- DropForeignKey
ALTER TABLE "Cart" DROP CONSTRAINT "Cart_userId_fkey";

-- DropForeignKey
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_cartId_fkey";

-- DropForeignKey
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_orderOrderId_fkey";

-- DropForeignKey
ALTER TABLE "Item" DROP CONSTRAINT "Item_cartId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_itemId_fkey";

-- AlterTable
ALTER TABLE "Address" ADD COLUMN     "house" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_pkey",
DROP COLUMN "cartId",
DROP COLUMN "id",
DROP COLUMN "orderOrderId",
DROP COLUMN "price",
ADD COLUMN     "colorOption" TEXT NOT NULL,
ADD COLUMN     "sizeOption" "Size" NOT NULL,
ADD COLUMN     "userId" INTEGER NOT NULL,
ADD CONSTRAINT "CartItem_pkey" PRIMARY KEY ("itemId", "userId");

-- AlterTable
ALTER TABLE "Item" DROP COLUMN "cartId";

-- AlterTable
ALTER TABLE "MediaObject" DROP COLUMN "type",
ADD COLUMN     "type" "MediaTypes" NOT NULL;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "amount",
DROP COLUMN "itemId";

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "colorOption" TEXT NOT NULL,
ADD COLUMN     "sizeOption" "Size" NOT NULL;

-- DropTable
DROP TABLE "Cart";

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
