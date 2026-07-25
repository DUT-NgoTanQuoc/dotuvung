-- Add quiz direction support (Vietnamese->English / English->Vietnamese / mixed).
-- All additions are backward compatible: existing rows default to "vi_en",
-- matching current behavior exactly. No data is dropped or modified.

ALTER TABLE "vocabulary_sets" ADD COLUMN "quiz_direction" TEXT NOT NULL DEFAULT 'vi_en';

ALTER TABLE "vocabularies" ADD COLUMN "accepted_answers_vi" TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE "attempt_answers" ADD COLUMN "direction" TEXT;
