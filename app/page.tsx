import { prisma } from "@/lib/prisma";
import { StartCard } from "@/app/StartCard";
import { BackgroundEffects } from "@/app/BackgroundEffects";
import { Hero } from "@/app/Hero";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ retrySlug?: string; retryName?: string }>;
}) {
  const { retrySlug, retryName } = await searchParams;
  const sets = await prisma.vocabularySet.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { slug: true, title: true, totalQuestions: true },
  });

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-8 sm:px-6">
      <BackgroundEffects />

      <main className="flex w-full max-w-lg flex-col items-center gap-8">
        <Hero />
        <StartCard sets={sets} defaultSlug={retrySlug} defaultName={retryName} />
      </main>
    </div>
  );
}
