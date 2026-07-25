import { prisma } from "@/lib/prisma";
import { StartForm } from "@/app/StartForm";
import { GraduationCap } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Home() {
  const sets = await prisma.vocabularySet.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { slug: true, title: true, totalQuestions: true },
  });

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-zinc-50 px-4 py-12 dark:bg-black">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,theme(colors.indigo.100),transparent_60%)] dark:bg-[radial-gradient(circle_at_50%_0%,theme(colors.indigo.950/40),transparent_60%)]"
      />
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            DÒ TỪ VỰNG
          </h1>
          <p className="text-sm text-zinc-500">Kiểm tra từ vựng tiếng Anh nhanh chóng, chính xác</p>
        </div>
        <StartForm sets={sets} />
      </div>
    </div>
  );
}
