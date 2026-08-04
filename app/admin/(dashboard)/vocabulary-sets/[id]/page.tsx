import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileUp, CalendarClock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { computeStatus } from "@/lib/exam-scheduling/status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/exam/StatusBadge";
import { BulkAddForm } from "@/app/admin/(dashboard)/vocabulary-sets/[id]/BulkAddForm";
import { VocabularyTable } from "@/app/admin/(dashboard)/vocabulary-sets/[id]/VocabularyTable";

export const dynamic = "force-dynamic";

export default async function VocabularySetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const set = await prisma.vocabularySet.findUnique({
    where: { id },
    include: { vocabularies: { orderBy: { english: "asc" } }, examSchedule: true },
  });
  if (!set) notFound();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <Link
          href="/admin/vocabulary-sets"
          className="mb-2 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Bộ từ vựng
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{set.title}</h1>
          <Badge variant={set.isActive ? "default" : "secondary"}>
            {set.isActive ? "Active" : "Ẩn"}
          </Badge>
          {set.examSchedule ? (
            <Link href="/admin/exam-schedules">
              <StatusBadge status={computeStatus(set.examSchedule, new Date())} />
            </Link>
          ) : (
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link href="/admin/exam-schedules">
                <CalendarClock className="h-3.5 w-3.5" />
                Lên lịch thi
              </Link>
            </Button>
          )}
        </div>
        <p className="text-sm text-zinc-500">
          {set.vocabularies.length} từ · {set.totalQuestions} câu/lượt · Điểm đạt {set.passScore} ·{" "}
          {set.secondsPerQuestion}s/câu ·{" "}
          {{ vi_en: "Việt→Anh", en_vi: "Anh→Việt", mixed: "Trộn Việt/Anh" }[set.quizDirection] ??
            set.quizDirection}
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Thêm từ vựng hàng loạt</CardTitle>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href={`/admin/vocabulary-sets/${set.id}/import`}>
              <FileUp className="h-3.5 w-3.5" />
              Import từ file
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <BulkAddForm setId={set.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách từ vựng ({set.vocabularies.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <VocabularyTable vocabularies={set.vocabularies} />
        </CardContent>
      </Card>
    </div>
  );
}
