import "server-only";

import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

import { db } from "@/db";
import { reports } from "@/db/schema";
import { auth } from "./auth";
import { reportIdFor } from "./diagnosis/diagnose";
import type { Memo, Report } from "./diagnosis/types";
import { isAllowedEmail, isLocalMode, ownerEmail } from "./env";

// Data access layer: every read and write of reports goes through here and
// checks who is asking first (Next.js data security guide).

export type Viewer = { email: string; local: boolean };

export const getViewer = cache(async (): Promise<Viewer | null> => {
  // Everything here is per request and private; never prerender it.
  await connection();
  // On the owner's Mac the app only listens on 127.0.0.1, so there is no login.
  if (isLocalMode()) return { email: ownerEmail(), local: true };

  const session = await auth().api.getSession({ headers: await headers() });
  const email = session?.user.email;
  if (!email || !isAllowedEmail(email)) return null;
  return { email: email.toLowerCase(), local: false };
});

export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  return viewer;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ReportSummary = { id: string; title: string; genre: string; createdAt: Date };

export async function listReports(): Promise<ReportSummary[]> {
  await requireViewer();
  return db()
    .select({ id: reports.id, title: reports.title, genre: reports.genre, createdAt: reports.createdAt })
    .from(reports)
    .orderBy(desc(reports.createdAt))
    .limit(200);
}

export async function getReport(id: string) {
  const viewer = await requireViewer();
  if (!UUID.test(id)) return null;
  const [row] = await db().select().from(reports).where(eq(reports.id, id)).limit(1);
  if (!row) return null;
  return { ...row, canDelete: row.createdBy === viewer.email };
}

export async function saveReport(memo: Memo, report: Report, responseId: string): Promise<string> {
  const viewer = await requireViewer();
  const id = reportIdFor(responseId);
  // Same response id, same report id: checking a finished diagnosis again (another tab, a retried request) saves nothing new.
  await db()
    .insert(reports)
    .values({
      id,
      title: titleFor(memo, report),
      genre: memo.genre,
      memo: memo.memo,
      references: memo.references,
      report,
      createdBy: viewer.email,
    })
    .onConflictDoNothing({ target: reports.id });
  return id;
}

export async function deleteReport(id: string): Promise<boolean> {
  const row = await getReport(id);
  if (!row?.canDelete) return false;
  await db().delete(reports).where(eq(reports.id, id));
  return true;
}

// The memo's first non-empty line is usually its working title or premise.
function titleFor(memo: Memo, report: Report) {
  const first = memo.memo.split("\n").map((l) => l.trim()).find(Boolean) ?? report.summary;
  return first.length > 60 ? `${first.slice(0, 60)}…` : first;
}
