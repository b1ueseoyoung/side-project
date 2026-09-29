import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { isLocalMode } from "@/lib/env";
import { Preview } from "./preview";

export const metadata: Metadata = {
  title: "디자인 미리보기 · 기획 메모 진단",
};

// Dev-only page for checking the decisions in DESIGN.md on real components.
export default async function DesignPage() {
  await connection();
  if (!isLocalMode()) notFound();
  return <Preview />;
}
