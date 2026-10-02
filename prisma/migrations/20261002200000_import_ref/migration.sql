-- AlterTable
ALTER TABLE "SalesOrder" ADD COLUMN     "importRef" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_importRef_key" ON "SalesOrder"("importRef");

