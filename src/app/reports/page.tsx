import { Reports } from "@/designs/impeccable/reports";
import { listReports, requireViewer } from "@/lib/dal";

export default async function ReportsPage() {
  const viewer = await requireViewer();
  const rows = await listReports();
  const reports = rows.map((r) => ({ id: r.id, title: r.title, genre: r.genre, createdAt: r.createdAt.toISOString() }));
  return <Reports reports={reports} signOut={!viewer.local} />;
}
