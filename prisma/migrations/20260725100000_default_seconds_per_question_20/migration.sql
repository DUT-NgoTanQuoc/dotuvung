-- Change default of vocabulary_sets.seconds_per_question from 10 to 20.
-- No data loss: existing rows keep their current value, only affects future inserts
-- that omit the column.
ALTER TABLE "vocabulary_sets" ALTER COLUMN "seconds_per_question" SET DEFAULT 20;
