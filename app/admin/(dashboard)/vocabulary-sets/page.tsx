import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateSetDialog } from "@/app/admin/(dashboard)/vocabulary-sets/CreateSetDialog";
import { SetActiveToggle, DeleteSetButton } from "@/app/admin/(dashboard)/vocabulary-sets/SetRowActions";

export const dynamic = "force-dynamic";

export default async function VocabularySetsPage() {
  const sets = await prisma.vocabularySet.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { vocabularies: true, attempts: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bộ từ vựng</h1>
        <CreateSetDialog />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tiêu đề</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Số từ / Tổng câu</TableHead>
            <TableHead>Điểm đạt</TableHead>
            <TableHead>Giây/câu</TableHead>
            <TableHead>Lượt làm</TableHead>
            <TableHead>Active</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sets.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-zinc-400">
                Chưa có bộ từ nào
              </TableCell>
            </TableRow>
          )}
          {sets.map((set) => (
            <TableRow key={set.id}>
              <TableCell>
                <Link
                  href={`/admin/vocabulary-sets/${set.id}`}
                  className="font-medium underline-offset-2 hover:underline"
                >
                  {set.title}
                </Link>
              </TableCell>
              <TableCell className="text-zinc-500">{set.slug}</TableCell>
              <TableCell>
                {set._count.vocabularies} / {set.totalQuestions}
              </TableCell>
              <TableCell>{set.passScore}</TableCell>
              <TableCell>{set.secondsPerQuestion}s</TableCell>
              <TableCell>{set._count.attempts}</TableCell>
              <TableCell>
                <SetActiveToggle id={set.id} isActive={set.isActive} />
              </TableCell>
              <TableCell>
                <DeleteSetButton id={set.id} title={set.title} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
