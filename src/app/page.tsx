import { Compose } from "@/designs/impeccable/compose";
import { requireViewer } from "@/lib/dal";

export default async function Home() {
  const viewer = await requireViewer();
  return <Compose signOut={!viewer.local} account={viewer.email} />;
}
