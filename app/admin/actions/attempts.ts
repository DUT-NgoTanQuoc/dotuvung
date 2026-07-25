"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function deleteAttempt(id: string): Promise<void> {
  await prisma.attempt.delete({ where: { id } });
  revalidatePath("/admin/attempts");
}
