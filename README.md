# Dò Từ Vựng

Website dò từ vựng tiếng Anh cho học sinh THCS/THPT. Giáo viên tạo bộ từ vựng theo tuần, học sinh nhập tên và làm bài (mỗi câu có giới hạn thời gian riêng, chấm điểm tự động PASS/FAIL), admin xem thống kê và lịch sử làm bài của toàn trường.

Xem [PROJECT_PLAN.md](./PROJECT_PLAN.md) để biết chi tiết thiết kế (schema, route map, quiz session engine).

## Công nghệ

- Next.js 16 (App Router) + TypeScript
- TailwindCSS + shadcn/ui
- Prisma 6 + PostgreSQL (Supabase)
- NextAuth v5 (Credentials, chỉ bảo vệ `/admin`)

## 1. Cài đặt

```bash
npm install
```

## 2. Cấu hình môi trường

Sao chép `.env.example` thành `.env` và điền connection string thật (Supabase: Project Settings → Database → Connection string).

```bash
cp .env.example .env
```

- `DATABASE_URL`: pooler transaction-mode (cổng **6543**, `pgbouncer=true`) — dùng lúc chạy app.
- `DIRECT_URL`: pooler session-mode (cổng **5432**) — dùng khi chạy `prisma migrate`.
- Nếu mật khẩu Supabase có ký tự đặc biệt (`#`, `@`, `%`, ...) phải URL-encode (ví dụ `#` → `%23`).
- `NEXTAUTH_SECRET`: tạo bằng `openssl rand -base64 32`.

## 3. Migrate database

```bash
npx prisma migrate dev
```

Lệnh này tạo các bảng: `vocabulary_sets`, `vocabularies`, `attempts`, `attempt_answers`, `admin_users`.

## 4. Seed dữ liệu mẫu

```bash
npm run db:seed
```

Tạo sẵn:

- Tài khoản admin: `admin@example.com` / `12345678`
- Week 1 (50 từ), Week 2 (50 từ), Week 3 (60 từ)

Script seed là idempotent — chạy lại nhiều lần không tạo trùng lặp (upsert theo slug/email, reset lại danh sách từ mỗi lần).

## 5. Chạy local

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000):

- Trang học sinh: nhập tên → chọn bộ từ → làm bài → xem kết quả.
- Trang admin: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

## 6. Kiểm tra build

```bash
npm run lint
npm run build
```

Cả hai lệnh phải chạy sạch (không lỗi) trước khi deploy.

## Luồng sử dụng

1. **Giáo viên** đăng nhập `/admin`, vào **Bộ từ vựng** → tạo bộ từ mới (tiêu đề, tổng số câu, điểm đạt PASS, số giây/câu) → mở bộ từ vừa tạo → dán danh sách từ vào ô "Thêm từ vựng hàng loạt", mỗi dòng theo định dạng:

   ```
   english | vietnamese | đáp án đúng khác (tuỳ chọn, phân cách bằng dấu phẩy)
   ```

   Ví dụ: `happy | vui vẻ | cheerful, glad`

2. **Học sinh** mở link trang chủ, nhập họ tên, chọn bộ từ, bấm **BẮT ĐẦU**.
3. Học sinh làm bài: mỗi câu hiển thị nghĩa tiếng Việt, gõ từ tiếng Anh, có đồng hồ đếm ngược riêng cho từng câu (mặc định 10 giây, admin cấu hình được). Hết giờ tự động chuyển câu tiếp theo (tính sai). Không thể quay lại câu trước. **Refresh trang vẫn tiếp tục đúng câu đang làm, không được cộng thêm thời gian.**
4. Nộp bài xong, hệ thống tự chấm điểm và hiển thị PASS/FAIL cùng danh sách từ sai.
5. **Admin** xem Dashboard (tổng lượt, PASS/FAIL, top 10), **Lịch sử** (danh sách toàn bộ lượt làm bài, click vào từng lượt để xem chi tiết câu đúng/sai).

## Deploy lên Vercel

1. Push code lên GitHub.
2. Trên [vercel.com](https://vercel.com), **Import Project** từ repo.
3. Vào **Settings → Environment Variables**, thêm:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` (đặt bằng domain Vercel sẽ cấp, ví dụ `https://dotuvung.vercel.app`)
4. Vercel tự chạy `npm run build`, script này đã bao gồm `prisma generate` (xem `package.json`).
5. Sau lần deploy đầu tiên, chạy migrate + seed nhắm vào database production (từ máy local, trỏ `.env` sang production `DATABASE_URL`/`DIRECT_URL`):

   ```bash
   npx prisma migrate deploy
   npm run db:seed
   ```

6. Đổi mật khẩu admin mặc định sau khi deploy thật (hiện chưa có trang đổi mật khẩu trong MVP — có thể cập nhật trực tiếp qua `prisma studio` hoặc SQL, hash bằng `bcryptjs`).

> **Lưu ý region**: nên chọn Vercel region gần với region Supabase (ví dụ Supabase ở Seoul thì chọn Vercel region `icn1`/gần Đông Á) để độ trễ database thấp — quan trọng vì mỗi câu hỏi có giới hạn thời gian ngắn.

## Giới hạn MVP (cố ý không làm)

- Không multi-tenant, không phân quyền nhiều role.
- Không email, không real-time, không i18n (giao diện tiếng Việt cố định).
- Không giới hạn số lần làm lại bài, không sửa đáp án sau khi nộp.
- Không chống gian lận nâng cao (phát hiện chuyển tab, khoá màn hình...).
- Không test tự động — đã kiểm thử thủ công toàn bộ flow (tạo bộ từ → làm bài → chấm điểm → PASS/FAIL → xem lịch sử admin).

## Cấu trúc thư mục chính

```
app/
  page.tsx                      Trang chủ học sinh
  actions/quiz.ts                Server actions: startAttempt, submitAnswer
  quiz/[slug]/                   Trang làm bài (Server + Client component)
  result/[id]/                   Trang kết quả
  admin/login/                   Đăng nhập admin
  admin/(dashboard)/             Dashboard, vocabulary-sets, attempts (route được bảo vệ)
lib/
  prisma.ts                      Prisma client singleton
  quiz/session.ts                Core quiz engine: random hoá câu hỏi, deadline server-side, chấm điểm
  auth.ts / auth.config.ts       NextAuth config
prisma/
  schema.prisma
  seed.ts
```
