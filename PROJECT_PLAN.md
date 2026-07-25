# PROJECT_PLAN: dotuvung — English Vocabulary Quiz Platform

## Context

Trường THCS/THPT cần một công cụ để giáo viên tạo bộ từ vựng theo tuần, học sinh làm bài dò từ (không cần đăng nhập, chỉ nhập tên), hệ thống tự chấm PASS/FAIL, và giáo viên/admin xem lại lịch sử toàn trường. Đây là MVP, build trong 1 ngày, ưu tiên chạy được đầu-cuối và deploy Vercel ngay hơn là kiến trúc hoàn hảo.

Quyết định đã chốt với người dùng:
- **DB**: Supabase Postgres (pooler đã verify kết nối OK, DB trống). `DATABASE_URL` dùng pooler port 6543 (`pgbouncer=true`) cho runtime, `DIRECT_URL` dùng port 5432 cho migrate. Password chứa `#` → phải URL-encode thành `%23`.
- **Auth**: NextAuth v5 (Credentials provider, bcrypt, JWT session) chỉ bảo vệ `/admin/*`.
- **Timer**: mỗi câu có giới hạn thời gian riêng, **mặc định 10 giây**, nhưng cấu hình được qua cột `seconds_per_question` trên `vocabulary_sets` (admin sửa được không cần deploy lại). Không cho quay lại câu trước.
- **Đáp án**: hỗ trợ nhiều đáp án đúng qua cột `accepted_answers String[]` để giảm oan sai do quan hệ Việt→Anh nhiều-nghĩa.
- **Screenshot**: dùng Browser pane (in-app) để tự chụp các trang chính sau khi seed xong.

## Scope (MVP — không over-engineer)

**Trong phạm vi:**
- Trang học sinh: nhập tên + chọn bộ từ → làm bài (random thứ tự, timer/câu server-authoritative, resume khi refresh, không quay lại) → kết quả (điểm, PASS/FAIL, danh sách từ sai).
- Admin (có đăng nhập): dashboard thống kê, CRUD vocabulary sets + vocabularies, xem danh sách attempts + chi tiết từng attempt (câu đúng/sai, thời gian).
- Seed: 1 admin account, Week 1 (50 từ), Week 2 (50 từ), Week 3 (60 từ).
- `npm run lint` và `npm run build` sạch. Deploy-ready cho Vercel.

**Ngoài phạm vi (ghi rõ để không lan man):**
- Không multi-tenant/multi-trường, không phân quyền nhiều role, không email, không real-time, không i18n UI (tiếng Việt hardcode), không thi lại có giới hạn số lần, không edit đáp án sau khi nộp, không anti-cheat nâng cao (tab-switch detection), không rate-limiting/captcha.
- Không viết test tự động (ngoài kiểm thử thủ công qua flow) — MVP 1 ngày.

## Database schema (Prisma)

```prisma
model VocabularySet {
  id                String   @id @default(cuid())
  title             String
  slug              String   @unique
  totalQuestions    Int      @map("total_questions")
  passScore         Int      @map("pass_score")
  secondsPerQuestion Int     @default(10) @map("seconds_per_question")
  isActive          Boolean  @default(true) @map("is_active")
  createdAt         DateTime @default(now()) @map("created_at")
  vocabularies      Vocabulary[]
  attempts          Attempt[]
  @@map("vocabulary_sets")
}

model Vocabulary {
  id              String   @id @default(cuid())
  setId           String   @map("set_id")
  english         String
  vietnamese      String
  acceptedAnswers String[] @default([]) @map("accepted_answers")
  set             VocabularySet   @relation(fields: [setId], references: [id], onDelete: Cascade)
  answers         AttemptAnswer[]
  @@index([setId])
  @@map("vocabularies")
}

model Attempt {
  id           String    @id @default(cuid())
  studentName  String    @map("student_name")
  setId        String    @map("set_id")
  sessionToken String    @unique @map("session_token")
  score        Int       @default(0)
  total        Int
  isPass       Boolean   @default(false) @map("is_pass")
  startedAt    DateTime  @default(now()) @map("started_at")
  finishedAt   DateTime? @map("finished_at")
  duration     Int?
  set          VocabularySet   @relation(fields: [setId], references: [id])
  answers      AttemptAnswer[]
  @@index([setId, finishedAt])
  @@map("attempts")
}

model AttemptAnswer {
  id           String    @id @default(cuid())
  attemptId    String    @map("attempt_id")
  vocabularyId String    @map("vocabulary_id")
  orderIndex   Int       @map("order_index")
  servedAt     DateTime? @map("served_at")
  deadlineAt   DateTime? @map("deadline_at")
  answeredAt   DateTime? @map("answered_at")
  userAnswer   String?   @map("user_answer")
  isCorrect    Boolean   @default(false) @map("is_correct")
  timedOut     Boolean   @default(false) @map("timed_out")
  attempt      Attempt    @relation(fields: [attemptId], references: [id], onDelete: Cascade)
  vocabulary   Vocabulary @relation(fields: [vocabularyId], references: [id])
  @@unique([attemptId, orderIndex])
  @@unique([attemptId, vocabularyId])
  @@index([attemptId, answeredAt, orderIndex])
  @@map("attempt_answers")
}

model AdminUser {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String   @map("password_hash")
  createdAt    DateTime @default(now()) @map("created_at")
  @@map("admin_users")
}
```

## Quiz session engine (core logic, from design review)

- **Question order**: pre-create all `attempt_answers` rows at attempt start (Fisher–Yates shuffle of vocabulary ids in JS), `orderIndex` 0..N-1. Current question = `findFirst({ where: { attemptId, answeredAt: null }, orderBy: { orderIndex: 'asc' } })`.
- **Deadline**: lazy — set `servedAt`/`deadlineAt` the first time a question is resolved (`deadlineAt = now + set.secondsPerQuestion*1000`), never reset. Refresh mid-question shows correct remaining time, never resets it.
- **Sweep loop** (`resolveCurrentQuestion`, runs every page load + after every submit, inside one `$transaction`): find first unanswered row → if no deadline yet, serve it fresh → if deadline passed, mark `timedOut:true, isCorrect:false` and loop to next → if none left, `finishAttempt` (idempotent, `updateMany` guarded by `finishedAt: null`) → else return remaining ms.
- **Submit path**: `submitAnswer({orderIndex, answer})` reads attempt from httpOnly cookie (`dv_attempt = attemptId.sessionToken`), conditional `updateMany where { id, answeredAt: null }` (idempotency guard — duplicate/late submits are no-ops), `GRACE_MS=1000` server-side tolerance before marking late, answer normalized (`trim, collapse spaces, lowercase`) and checked against `[english, ...acceptedAnswers]`.
- **Server Actions** (not Route Handlers): `startAttempt` (form action, sets cookie, `redirect`), `submitAnswer` (plain async fn called from client `startTransition`, returns next-question JSON — not a redirect, for snappy transitions), internal `finishAttempt`.
- **Client component** (`QuizRunner`): holds `value`, `question` (server-fed, replaced by submitAnswer's return), countdown via `performance.now()` (relative, immune to clock skew), `lockRef` to prevent double-submit race between timer-expiry and manual click; `key={question.orderIndex}` on the client component forces clean remount per question.
- **Cookie**: `dv_attempt` httpOnly, sameSite=lax, secure in prod, 4h maxAge. `/result/[id]` is publicly viewable once finished (score/name only); unfinished attempts require matching cookie else 404.
- **Edge cases handled**: no cookie → redirect `/`; cookie for wrong slug → redirect to correct quiz or its result; inactive set + no in-progress attempt → 404; already finished → redirect to result; `total_questions > vocab count` → clamp `total = min(totalQuestions, vocabCount)` at attempt creation (seed script asserts counts match to avoid this in practice); same name twice → allowed, no uniqueness on studentName; server restart → no impact, all state in Postgres with absolute timestamps.

## Route map

```
/                                  Trang chủ: nhập tên + chọn set (Server Component, Server Action form)
/quiz/[slug]                       Làm bài (Server Component wrapper + QuizRunner client component)
/result/[id]                       Kết quả: điểm, PASS/FAIL, danh sách từ sai

/admin/login                       NextAuth Credentials sign-in
/admin                             Dashboard: tổng lượt, PASS/FAIL count, set active, top 10
/admin/vocabulary-sets             List + CRUD (create/edit/toggle active) sets
/admin/vocabulary-sets/[id]        Vocabularies CRUD trong 1 set (bulk textarea + table)
/admin/attempts                    DataTable: tên | bộ từ | điểm | pass | thời gian
/admin/attempts/[id]               Chi tiết: câu đúng/sai, thời gian làm

api/auth/[...nextauth]             NextAuth handler
```

## Component tree (essentials)

```
app/
  layout.tsx                       Root layout, Tailwind, font
  page.tsx                         Home (Server) — <StartForm/>
  actions/quiz.ts                  startAttempt, submitAnswer (server actions)
  quiz/[slug]/page.tsx             Server: cookie → sweep → redirect or render
  quiz/[slug]/QuizRunner.tsx       Client: countdown, input, submit
  result/[id]/page.tsx             Server: fetch attempt+answers, render score card
  admin/
    login/page.tsx
    layout.tsx                    Auth guard (redirect if no session) + nav
    page.tsx                      Dashboard cards
    vocabulary-sets/page.tsx       Table + create dialog
    vocabulary-sets/[id]/page.tsx  Vocab CRUD (shadcn DataTable + bulk-add textarea)
    attempts/page.tsx              DataTable (shadcn)
    attempts/[id]/page.tsx         Detail view
    actions/{sets,vocab,auth}.ts   Server actions for admin CRUD
lib/
  prisma.ts                        Singleton client
  quiz/session.ts                  resolveCurrentQuestion, matches(), cookie read/write, constants
  auth.ts                          NextAuth config (Credentials, bcrypt compare)
  utils.ts                         cn() shadcn helper
components/ui/*                    shadcn primitives (button, input, card, table, dialog, badge, progress)
prisma/
  schema.prisma
  seed.ts                          Admin user + Week 1/2/3 vocab (accepted_answers included)
```

## Deployment checklist

1. `.env` (local, gitignored) — `DATABASE_URL` (pooler:6543, pgbouncer=true, URL-encoded password), `DIRECT_URL` (5432), `NEXTAUTH_SECRET`, `NEXTAUTH_URL=http://localhost:3000`.
2. `.env.example` committed with placeholders + comments explaining pooler vs direct and URL-encoding note for special chars.
3. `prisma migrate dev` against `DIRECT_URL` → creates tables in Supabase.
4. `prisma/seed.ts` via `prisma db seed` → admin user (`admin@example.com` / `12345678`, bcrypt-hashed) + Week 1/2/3.
5. `npm run dev` → manually walk the full flow in Browser pane, screenshot each page into `docs/screenshots/`.
6. `npm run lint` and `npm run build` must both pass clean.
7. README.md: install → migrate → seed → dev → deploy steps; Vercel env vars needed (`DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`).
8. Vercel: connect repo (or `vercel` CLI), set env vars, `prisma generate` in build (postinstall script), deploy.
9. Final manual smoke test on the deployed URL if user wants; otherwise document as a checklist.

## Verification plan

- Manual E2E via Browser pane: home → pick Week 1 → answer some right/wrong/timeout → land on result → verify PASS/FAIL math (>=40/50) → admin login → dashboard numbers match → attempts list shows the run → attempt detail shows correct right/wrong breakdown → create a new vocabulary set via admin UI → verify it appears on home page.
- Refresh mid-quiz to confirm resume works and timer doesn't reset.
- `npm run lint` / `npm run build` clean.
- `git init` + initial commit with message `feat: initial MVP for English vocabulary quiz platform`.
