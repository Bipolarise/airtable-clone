-- CreateEnum
CREATE TYPE "ColumnType" AS ENUM ('TEXT', 'NUMBER');

-- CreateTable
CREATE TABLE "Table" (
    "id" TEXT NOT NULL,
    "baseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Table_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Column" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ColumnType" NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Column_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Row" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Row_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TableView" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filters" JSONB,
    "sorts" JSONB,
    "search" TEXT,
    "hiddenColumnIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TableView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Table_baseId_idx" ON "Table"("baseId");

-- CreateIndex
CREATE INDEX "Table_name_idx" ON "Table"("name");

-- CreateIndex
CREATE INDEX "Column_tableId_ordinal_idx" ON "Column"("tableId", "ordinal");

-- CreateIndex
CREATE INDEX "Column_tableId_name_idx" ON "Column"("tableId", "name");

-- CreateIndex
CREATE INDEX "Row_tableId_createdAt_idx" ON "Row"("tableId", "createdAt");

-- CreateIndex
CREATE INDEX "Row_tableId_id_idx" ON "Row"("tableId", "id");

-- CreateIndex
CREATE INDEX "TableView_tableId_name_idx" ON "TableView"("tableId", "name");

-- AddForeignKey
ALTER TABLE "Table" ADD CONSTRAINT "Table_baseId_fkey" FOREIGN KEY ("baseId") REFERENCES "Base"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Column" ADD CONSTRAINT "Column_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Row" ADD CONSTRAINT "Row_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableView" ADD CONSTRAINT "TableView_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE CASCADE ON UPDATE CASCADE;
