import { prisma } from "@/lib/prisma";
import { StartForm } from "@/app/StartForm";

export const dynamic = "force-dynamic";

export default async function Home() {
  const sets = await prisma.vocabularySet.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { slug: true, title: true, totalQuestions: true },
  });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black">
      <div className="w-full max-w-md">
        <h1 className="mb-8 text-center text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          DÒ TỪ VỰNG
        </h1>
        <StartForm sets={sets} />
      </div>
    </div>
  );
}
