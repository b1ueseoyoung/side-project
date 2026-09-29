import type { Metadata } from "next";
import { Preview } from "./preview";

export const metadata: Metadata = {
  title: "디자인 미리보기 · 투고 전 원고 진단",
};

// Dev-only page for checking the decisions in DESIGN.md on real components.
export default function DesignPage() {
  return <Preview />;
}
