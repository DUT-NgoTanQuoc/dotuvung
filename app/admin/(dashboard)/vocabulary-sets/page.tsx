import { prisma } from "@/lib/prisma";
import { CreateSetDialog } from "@/app/admin/(dashboard)/vocabulary-sets/CreateSetDialog";
import { VocabularySetsTable } from "@/app/admin/(dashboard)/vocabulary-sets/VocabularySetsTable";

export const dynamic = "force-dynamic";

export default async function VocabularySetsPage() {
  const sets = await prisma.vocabularySet.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { vocabularies: true, attempts: true } } },
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bộ từ vựng</h1>
          <p className="text-sm text-zinc-500">Quản lý các bộ từ vựng theo tuần</p>
        </div>
        <CreateSetDialog />
      </div>

      <VocabularySetsTable sets={sets} />
    </div>
  );
}
