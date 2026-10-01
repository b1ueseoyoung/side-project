import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

import { db } from "@/db";
import { reports } from "@/db/schema";
import { auth } from "./auth";
import { reportIdFor } from "./diagnosis/diagnose";
import type { Memo, Report } from "./diagnosis/types";
import { isLocalMode, ownerEmail } from "./env";

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
  if (!email) return null;
  return { email: email.toLowerCase(), local: false };
});

export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  return viewer;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ReportSummary = { id: string; title: string; genre: string; createdAt: Date };

// Reports are private: every query below is limited to the viewer's own.
export async function listReports(): Promise<ReportSummary[]> {
  const viewer = await requireViewer();
  return db()
    .select({ id: reports.id, title: reports.title, genre: reports.genre, createdAt: reports.createdAt })
    .from(reports)
    .where(eq(reports.createdBy, viewer.email))
    .orderBy(desc(reports.createdAt))
    .limit(200);
}

export async function getReport(id: string) {
  const viewer = await requireViewer();
  if (!UUID.test(id)) return null;
  const [row] = await db()
    .select()
    .from(reports)
    .where(and(eq(reports.id, id), eq(reports.createdBy, viewer.email)))
    .limit(1);
  return row ?? null;
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
  if (!row) return false;
  await db().delete(reports).where(eq(reports.id, id));
  return true;
}

// The memo's first non-empty line is usually its working title or premise.
function titleFor(memo: Memo, report: Report) {
  const first = memo.memo.split("\n").map((l) => l.trim()).find(Boolean) ?? report.summary;
  return first.length > 60 ? `${first.slice(0, 60)}…` : first;
}
