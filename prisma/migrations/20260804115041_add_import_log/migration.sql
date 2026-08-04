-- CreateTable
CREATE TABLE "import_logs" (
    "id" TEXT NOT NULL,
    "set_id" TEXT NOT NULL,
    "admin_email" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "total_rows" INTEGER NOT NULL,
    "imported_rows" INTEGER NOT NULL,
    "duplicate_rows" INTEGER NOT NULL,
    "error_rows" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "import_logs_set_id_idx" ON "import_logs"("set_id");

-- AddForeignKey
ALTER TABLE "import_logs" ADD CONSTRAINT "import_logs_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "vocabulary_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
