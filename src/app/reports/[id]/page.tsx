import { notFound } from "next/navigation";

import { Workspace } from "@/designs/impeccable/workspace";
import { getReport, requireViewer } from "@/lib/dal";

export default async function ReportPage({ params }: PageProps<"/reports/[id]">) {
  const viewer = await requireViewer();
  const { id } = await params;
  const row = await getReport(id);
  if (!row) notFound();

  const doc = {
    id: row.id,
    title: row.title,
    genre: row.genre,
    createdAt: row.createdAt.toISOString(),
    memo: { genre: row.genre, memo: row.memo, references: row.references },
    report: row.report,
  };
  return <Workspace doc={doc} signOut={!viewer.local} />;
}
