import type { Memo, Report } from "@/lib/diagnosis/types";

/** One saved report as the workspace receives it. */
export type ReportDoc = {
  id: string;
  title: string;
  genre: string;
  /** ISO time */
  createdAt: string;
  memo: Memo;
  report: Report;
};
