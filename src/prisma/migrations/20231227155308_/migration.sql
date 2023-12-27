/*
  Warnings:

  - The values [video] on the enum `MediaTypes` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `stockCount` on the `Item` table. All the data in the column will be lost.
  - The primary key for the `MediaObject` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `colorValue` on the `MediaObject` table. All the data in the column will be lost.
  - Added the required column `colorOption` to the `MediaObject` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "MediaTypes_new" AS ENUM ('image');
ALTER TABLE "MediaObject" ALTER COLUMN "type" TYPE "MediaTypes_new" USING ("type"::text::"MediaTypes_new");
ALTER TYPE "MediaTypes" RENAME TO "MediaTypes_old";
ALTER TYPE "MediaTypes_new" RENAME TO "MediaTypes";
DROP TYPE "MediaTypes_old";
COMMIT;

-- AlterTable
ALTER TABLE "Item" DROP COLUMN "stockCount";

-- AlterTable
ALTER TABLE "MediaObject" DROP CONSTRAINT "MediaObject_pkey",
DROP COLUMN "colorValue",
ADD COLUMN     "colorOption" TEXT NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "MediaObject_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "MediaObject_id_seq";

-- CreateTable
CREATE TABLE "stockCount" (
    "itemId" INTEGER NOT NULL,
    "colorOption" TEXT NOT NULL,
    "sizeOption" "Size" NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "stockCount_pkey" PRIMARY KEY ("itemId","colorOption","sizeOption")
);

-- CreateIndex
CREATE INDEX "MediaObject_itemId_colorOption_idx" ON "MediaObject"("itemId", "colorOption");

-- AddForeignKey
ALTER TABLE "stockCount" ADD CONSTRAINT "stockCount_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
