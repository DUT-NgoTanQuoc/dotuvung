-- CreateTable
CREATE TABLE "vocabulary_sets" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "total_questions" INTEGER NOT NULL,
    "pass_score" INTEGER NOT NULL,
    "seconds_per_question" INTEGER NOT NULL DEFAULT 10,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vocabulary_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vocabularies" (
    "id" TEXT NOT NULL,
    "set_id" TEXT NOT NULL,
    "english" TEXT NOT NULL,
    "vietnamese" TEXT NOT NULL,
    "accepted_answers" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "vocabularies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempts" (
    "id" TEXT NOT NULL,
    "student_name" TEXT NOT NULL,
    "set_id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "is_pass" BOOLEAN NOT NULL DEFAULT false,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "duration" INTEGER,

    CONSTRAINT "attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempt_answers" (
    "id" TEXT NOT NULL,
    "attempt_id" TEXT NOT NULL,
    "vocabulary_id" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "served_at" TIMESTAMP(3),
    "deadline_at" TIMESTAMP(3),
    "answered_at" TIMESTAMP(3),
    "user_answer" TEXT,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "timed_out" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "attempt_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vocabulary_sets_slug_key" ON "vocabulary_sets"("slug");

-- CreateIndex
CREATE INDEX "vocabularies_set_id_idx" ON "vocabularies"("set_id");

-- CreateIndex
CREATE UNIQUE INDEX "attempts_session_token_key" ON "attempts"("session_token");

-- CreateIndex
CREATE INDEX "attempts_set_id_finished_at_idx" ON "attempts"("set_id", "finished_at");

-- CreateIndex
CREATE INDEX "attempt_answers_attempt_id_answered_at_order_index_idx" ON "attempt_answers"("attempt_id", "answered_at", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "attempt_answers_attempt_id_order_index_key" ON "attempt_answers"("attempt_id", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "attempt_answers_attempt_id_vocabulary_id_key" ON "attempt_answers"("attempt_id", "vocabulary_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- AddForeignKey
ALTER TABLE "vocabularies" ADD CONSTRAINT "vocabularies_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "vocabulary_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "vocabulary_sets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_answers" ADD CONSTRAINT "attempt_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_answers" ADD CONSTRAINT "attempt_answers_vocabulary_id_fkey" FOREIGN KEY ("vocabulary_id") REFERENCES "vocabularies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
