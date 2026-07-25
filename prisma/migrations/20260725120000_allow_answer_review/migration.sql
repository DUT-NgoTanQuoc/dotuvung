-- Allow admins to control whether students can review per-question answer detail after finishing a set.
-- Backward compatible: existing sets default to true (current behavior).

ALTER TABLE "vocabulary_sets" ADD COLUMN "allow_answer_review" BOOLEAN NOT NULL DEFAULT true;
