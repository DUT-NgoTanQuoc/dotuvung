-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'OPEN', 'CLOSED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "exam_schedules" (
    "id" TEXT NOT NULL,
    "set_id" TEXT NOT NULL,
    "description" TEXT,
    "attempt_limit" INTEGER,
    "open_at" TIMESTAMP(3) NOT NULL,
    "close_at" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    "status" "ExamStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT,
    "published_at" TIMESTAMP(3),
    "opened_at" TIMESTAMP(3),
    "opened_by" TEXT,
    "closed_at" TIMESTAMP(3),
    "closed_by" TEXT,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_audit_logs" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "admin_id" TEXT,
    "action" TEXT NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exam_schedules_set_id_key" ON "exam_schedules"("set_id");

-- CreateIndex
CREATE INDEX "exam_schedules_status_idx" ON "exam_schedules"("status");

-- CreateIndex
CREATE INDEX "exam_schedules_open_at_idx" ON "exam_schedules"("open_at");

-- CreateIndex
CREATE INDEX "exam_schedules_close_at_idx" ON "exam_schedules"("close_at");

-- CreateIndex
CREATE INDEX "exam_audit_logs_schedule_id_idx" ON "exam_audit_logs"("schedule_id");

-- AddForeignKey
ALTER TABLE "exam_schedules" ADD CONSTRAINT "exam_schedules_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "vocabulary_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_audit_logs" ADD CONSTRAINT "exam_audit_logs_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "exam_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
