-- AlterTable
ALTER TABLE "vocabulary_sets" ADD COLUMN     "show_wrong_answer" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "wrong_answer_display_ms" INTEGER NOT NULL DEFAULT 2400;
