-- DropForeignKey
ALTER TABLE "MediaObject" DROP CONSTRAINT "MediaObject_itemId_fkey";

-- DropForeignKey
ALTER TABLE "stockCount" DROP CONSTRAINT "stockCount_itemId_fkey";

-- AddForeignKey
ALTER TABLE "stockCount" ADD CONSTRAINT "stockCount_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaObject" ADD CONSTRAINT "MediaObject_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
