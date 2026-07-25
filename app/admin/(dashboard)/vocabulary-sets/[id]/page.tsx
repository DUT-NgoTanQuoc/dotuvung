import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BulkAddForm } from "@/app/admin/(dashboard)/vocabulary-sets/[id]/BulkAddForm";
import { VocabRowActions } from "@/app/admin/(dashboard)/vocabulary-sets/[id]/VocabRowActions";

export const dynamic = "force-dynamic";

export default async function VocabularySetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const set = await prisma.vocabularySet.findUnique({
    where: { id },
    include: { vocabularies: { orderBy: { english: "asc" } } },
  });
  if (!set) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{set.title}</h1>
        <p className="text-sm text-zinc-500">
          {set.vocabularies.length} từ · {set.totalQuestions} câu/lượt · Điểm đạt {set.passScore} ·{" "}
          {set.secondsPerQuestion}s/câu
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Thêm từ vựng hàng loạt</CardTitle>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>English</TableHead>
                <TableHead>Vietnamese</TableHead>
                <TableHead>Đáp án khác</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {set.vocabularies.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-zinc-400">
                    Chưa có từ nào
                  </TableCell>
                </TableRow>
              )}
              {set.vocabularies.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.english}</TableCell>
                  <TableCell>{v.vietnamese}</TableCell>
                  <TableCell className="text-zinc-500">
                    {v.acceptedAnswers.join(", ")}
                  </TableCell>
                  <TableCell>
                    <VocabRowActions vocab={v} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
