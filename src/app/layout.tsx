import type { Metadata } from "next";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
});

// Editor's voice: 총평, comments and script quotes (DESIGN.md: 글꼴).
const notoSerifKr = Noto_Serif_KR({
  variable: "--font-noto-serif-kr",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "투고 전 원고 진단",
  description:
    "웹툰 지망생이 투고 전에 기획서와 1~3화 원고를 진단받고 가장 먼저 고칠 점을 확인하는 서비스",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${notoSansKr.variable} ${notoSerifKr.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
