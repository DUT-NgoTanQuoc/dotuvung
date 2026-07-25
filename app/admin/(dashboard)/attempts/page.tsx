import { prisma } from "@/lib/prisma";
import { AttemptsTable } from "@/app/admin/(dashboard)/attempts/AttemptsTable";

export const dynamic = "force-dynamic";

export default async function AttemptsPage() {
  const attempts = await prisma.attempt.findMany({
    where: { finishedAt: { not: null } },
    orderBy: { finishedAt: "desc" },
    include: { set: true },
    take: 200,
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold">Lịch sử làm bài</h1>
        <p className="text-sm text-zinc-500">Toàn bộ lượt làm bài đã nộp của học sinh</p>
      </div>
      <AttemptsTable attempts={attempts} />
    </div>
  );
}
