import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type WordEntry = { english: string; vietnamese: string; acceptedAnswers?: string[] };

// Week 1 — everyday nouns / animals / school items (50 words)
const week1: WordEntry[] = [
  { english: "cat", vietnamese: "con mèo" },
  { english: "dog", vietnamese: "con chó" },
  { english: "bird", vietnamese: "con chim" },
  { english: "fish", vietnamese: "con cá" },
  { english: "cow", vietnamese: "con bò" },
  { english: "pig", vietnamese: "con lợn", acceptedAnswers: ["hog"] },
  { english: "chicken", vietnamese: "con gà" },
  { english: "duck", vietnamese: "con vịt" },
  { english: "horse", vietnamese: "con ngựa" },
  { english: "elephant", vietnamese: "con voi" },
  { english: "tiger", vietnamese: "con hổ" },
  { english: "lion", vietnamese: "con sư tử" },
  { english: "monkey", vietnamese: "con khỉ" },
  { english: "rabbit", vietnamese: "con thỏ" },
  { english: "snake", vietnamese: "con rắn" },
  { english: "apple", vietnamese: "quả táo" },
  { english: "banana", vietnamese: "quả chuối" },
  { english: "orange", vietnamese: "quả cam" },
  { english: "grape", vietnamese: "quả nho" },
  { english: "mango", vietnamese: "quả xoài" },
  { english: "watermelon", vietnamese: "quả dưa hấu" },
  { english: "pineapple", vietnamese: "quả dứa" },
  { english: "strawberry", vietnamese: "quả dâu tây" },
  { english: "lemon", vietnamese: "quả chanh" },
  { english: "coconut", vietnamese: "quả dừa" },
  { english: "school", vietnamese: "trường học" },
  { english: "book", vietnamese: "quyển sách", acceptedAnswers: ["cuốn sách"] },
  { english: "pen", vietnamese: "cây bút mực", acceptedAnswers: ["bút mực"] },
  { english: "pencil", vietnamese: "cây bút chì", acceptedAnswers: ["bút chì"] },
  { english: "eraser", vietnamese: "cục tẩy" },
  { english: "ruler", vietnamese: "cây thước", acceptedAnswers: ["thước kẻ"] },
  { english: "bag", vietnamese: "cái cặp", acceptedAnswers: ["túi"] },
  { english: "chair", vietnamese: "cái ghế" },
  { english: "table", vietnamese: "cái bàn" },
  { english: "blackboard", vietnamese: "bảng đen" },
  { english: "classroom", vietnamese: "phòng học" },
  { english: "teacher", vietnamese: "giáo viên" },
  { english: "student", vietnamese: "học sinh" },
  { english: "friend", vietnamese: "bạn bè" },
  { english: "family", vietnamese: "gia đình" },
  { english: "father", vietnamese: "bố", acceptedAnswers: ["ba", "cha", "dad"] },
  { english: "mother", vietnamese: "mẹ", acceptedAnswers: ["má", "mom", "mum"] },
  { english: "brother", vietnamese: "anh trai", acceptedAnswers: ["em trai"] },
  { english: "sister", vietnamese: "chị gái", acceptedAnswers: ["em gái"] },
  { english: "house", vietnamese: "ngôi nhà", acceptedAnswers: ["nhà"] },
  { english: "door", vietnamese: "cái cửa" },
  { english: "window", vietnamese: "cửa sổ" },
  { english: "bed", vietnamese: "cái giường" },
  { english: "clock", vietnamese: "cái đồng hồ" },
  { english: "phone", vietnamese: "điện thoại", acceptedAnswers: ["telephone"] },
];

// Week 2 — common verbs and adjectives (50 words)
const week2: WordEntry[] = [
  { english: "run", vietnamese: "chạy" },
  { english: "walk", vietnamese: "đi bộ" },
  { english: "jump", vietnamese: "nhảy" },
  { english: "swim", vietnamese: "bơi" },
  { english: "eat", vietnamese: "ăn" },
  { english: "drink", vietnamese: "uống" },
  { english: "sleep", vietnamese: "ngủ" },
  { english: "study", vietnamese: "học" },
  { english: "read", vietnamese: "đọc" },
  { english: "write", vietnamese: "viết" },
  { english: "listen", vietnamese: "nghe" },
  { english: "speak", vietnamese: "nói", acceptedAnswers: ["talk"] },
  { english: "watch", vietnamese: "xem" },
  { english: "play", vietnamese: "chơi" },
  { english: "work", vietnamese: "làm việc" },
  { english: "cook", vietnamese: "nấu ăn" },
  { english: "clean", vietnamese: "dọn dẹp" },
  { english: "wash", vietnamese: "rửa" },
  { english: "buy", vietnamese: "mua" },
  { english: "sell", vietnamese: "bán" },
  { english: "open", vietnamese: "mở" },
  { english: "close", vietnamese: "đóng" },
  { english: "give", vietnamese: "cho", acceptedAnswers: ["đưa"] },
  { english: "take", vietnamese: "lấy" },
  { english: "make", vietnamese: "làm", acceptedAnswers: ["tạo ra"] },
  { english: "help", vietnamese: "giúp đỡ" },
  { english: "smile", vietnamese: "mỉm cười" },
  { english: "cry", vietnamese: "khóc" },
  { english: "laugh", vietnamese: "cười to", acceptedAnswers: ["cười"] },
  { english: "sing", vietnamese: "hát" },
  { english: "dance", vietnamese: "nhảy múa" },
  { english: "draw", vietnamese: "vẽ" },
  { english: "happy", vietnamese: "vui vẻ", acceptedAnswers: ["hạnh phúc", "cheerful", "glad"] },
  { english: "sad", vietnamese: "buồn" },
  { english: "angry", vietnamese: "tức giận" },
  { english: "tired", vietnamese: "mệt mỏi" },
  { english: "hungry", vietnamese: "đói" },
  { english: "thirsty", vietnamese: "khát" },
  { english: "big", vietnamese: "to", acceptedAnswers: ["lớn", "large"] },
  { english: "small", vietnamese: "nhỏ", acceptedAnswers: ["little"] },
  { english: "tall", vietnamese: "cao" },
  { english: "short", vietnamese: "thấp", acceptedAnswers: ["ngắn"] },
  { english: "fast", vietnamese: "nhanh", acceptedAnswers: ["quick"] },
  { english: "slow", vietnamese: "chậm" },
  { english: "strong", vietnamese: "khỏe mạnh", acceptedAnswers: ["mạnh mẽ", "powerful"] },
  { english: "weak", vietnamese: "yếu" },
  { english: "beautiful", vietnamese: "xinh đẹp", acceptedAnswers: ["đẹp", "pretty"] },
  { english: "hardworking", vietnamese: "chăm chỉ" },
  { english: "lazy", vietnamese: "lười biếng" },
  { english: "clever", vietnamese: "thông minh", acceptedAnswers: ["smart", "intelligent"] },
];

// Week 3 — school subjects, technology, environment, occupations (60 words)
const week3: WordEntry[] = [
  { english: "mathematics", vietnamese: "môn toán", acceptedAnswers: ["math"] },
  { english: "literature", vietnamese: "môn văn" },
  { english: "history", vietnamese: "môn lịch sử" },
  { english: "geography", vietnamese: "môn địa lý" },
  { english: "physics", vietnamese: "môn vật lý" },
  { english: "chemistry", vietnamese: "môn hóa học" },
  { english: "biology", vietnamese: "môn sinh học" },
  { english: "technology", vietnamese: "công nghệ" },
  { english: "computer", vietnamese: "máy vi tính", acceptedAnswers: ["máy tính"] },
  { english: "internet", vietnamese: "mạng internet" },
  { english: "keyboard", vietnamese: "bàn phím" },
  { english: "screen", vietnamese: "màn hình" },
  { english: "software", vietnamese: "phần mềm" },
  { english: "website", vietnamese: "trang web" },
  { english: "email", vietnamese: "thư điện tử" },
  { english: "environment", vietnamese: "môi trường" },
  { english: "pollution", vietnamese: "ô nhiễm" },
  { english: "recycle", vietnamese: "tái chế" },
  { english: "climate", vietnamese: "khí hậu" },
  { english: "weather", vietnamese: "thời tiết" },
  { english: "forest", vietnamese: "rừng" },
  { english: "river", vietnamese: "dòng sông", acceptedAnswers: ["sông"] },
  { english: "mountain", vietnamese: "ngọn núi", acceptedAnswers: ["núi"] },
  { english: "ocean", vietnamese: "đại dương", acceptedAnswers: ["sea", "biển"] },
  { english: "island", vietnamese: "hòn đảo", acceptedAnswers: ["đảo"] },
  { english: "engineer", vietnamese: "kỹ sư" },
  { english: "doctor", vietnamese: "bác sĩ" },
  { english: "nurse", vietnamese: "y tá" },
  { english: "farmer", vietnamese: "nông dân" },
  { english: "worker", vietnamese: "công nhân" },
  { english: "driver", vietnamese: "tài xế" },
  { english: "pilot", vietnamese: "phi công" },
  { english: "police", vietnamese: "cảnh sát", acceptedAnswers: ["policeman", "police officer"] },
  { english: "firefighter", vietnamese: "lính cứu hỏa" },
  { english: "scientist", vietnamese: "nhà khoa học" },
  { english: "artist", vietnamese: "nghệ sĩ" },
  { english: "singer", vietnamese: "ca sĩ" },
  { english: "writer", vietnamese: "nhà văn" },
  { english: "athlete", vietnamese: "vận động viên" },
  { english: "lawyer", vietnamese: "luật sư" },
  { english: "library", vietnamese: "thư viện" },
  { english: "hospital", vietnamese: "bệnh viện" },
  { english: "airport", vietnamese: "sân bay" },
  { english: "market", vietnamese: "chợ" },
  { english: "supermarket", vietnamese: "siêu thị" },
  { english: "restaurant", vietnamese: "nhà hàng" },
  { english: "factory", vietnamese: "nhà máy" },
  { english: "bridge", vietnamese: "cây cầu", acceptedAnswers: ["cầu"] },
  { english: "traffic", vietnamese: "giao thông" },
  { english: "vehicle", vietnamese: "phương tiện" },
  { english: "bicycle", vietnamese: "xe đạp", acceptedAnswers: ["bike"] },
  { english: "motorbike", vietnamese: "xe máy", acceptedAnswers: ["motorcycle"] },
  { english: "train", vietnamese: "tàu hỏa" },
  { english: "airplane", vietnamese: "máy bay", acceptedAnswers: ["plane"] },
  { english: "ship", vietnamese: "tàu thủy", acceptedAnswers: ["boat"] },
  { english: "festival", vietnamese: "lễ hội" },
  { english: "tradition", vietnamese: "truyền thống" },
  { english: "culture", vietnamese: "văn hóa" },
  { english: "holiday", vietnamese: "kỳ nghỉ", acceptedAnswers: ["ngày lễ", "vacation"] },
  { english: "celebration", vietnamese: "sự ăn mừng" },
];

async function seedSet(
  title: string,
  slug: string,
  totalQuestions: number,
  passScore: number,
  words: WordEntry[]
) {
  if (words.length < totalQuestions) {
    throw new Error(
      `Seed error: "${title}" needs at least ${totalQuestions} words but only has ${words.length}.`
    );
  }

  const set = await prisma.vocabularySet.upsert({
    where: { slug },
    update: { title, totalQuestions, passScore },
    create: { title, slug, totalQuestions, passScore, secondsPerQuestion: 10, isActive: true },
  });

  // Reset vocabularies for idempotent re-seeding.
  await prisma.vocabulary.deleteMany({ where: { setId: set.id } });
  await prisma.vocabulary.createMany({
    data: words.map((w) => ({
      setId: set.id,
      english: w.english,
      vietnamese: w.vietnamese,
      acceptedAnswers: w.acceptedAnswers ?? [],
    })),
  });

  console.log(`Seeded "${title}" with ${words.length} words.`);
}

async function main() {
  const adminEmail = "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "12345678";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: { passwordHash },
    create: { email: adminEmail, passwordHash },
  });
  console.log(`Seeded admin user: ${adminEmail} / ${adminPassword}`);

  await seedSet("Week 1", "week-1", 50, 40, week1);
  await seedSet("Week 2", "week-2", 50, 40, week2);
  await seedSet("Week 3", "week-3", 60, 50, week3);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
