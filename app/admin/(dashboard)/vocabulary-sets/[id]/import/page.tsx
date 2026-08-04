import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ImportWizard } from "@/app/admin/(dashboard)/vocabulary-sets/[id]/import/ImportWizard";

export const dynamic = "force-dynamic";

export default async function ImportVocabularyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const set = await prisma.vocabularySet.findUnique({
    where: { id },
    select: { id: true, title: true, _count: { select: { vocabularies: true } } },
  });
  if (!set) notFound();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <Link
          href={`/admin/vocabulary-sets/${set.id}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {set.title}
        </Link>
        <h1 className="text-2xl font-bold">Import từ vựng</h1>
        <p className="text-sm text-zinc-500">
          Đang có {set._count.vocabularies} từ trong bộ này. Upload file Word/Excel/CSV/TXT hoặc dán trực
          tiếp nội dung để phân tích và xem trước trước khi lưu.
        </p>
      </div>

      <ImportWizard setId={set.id} />
    </div>
  );
}
