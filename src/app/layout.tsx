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
  title: "기획 메모 진단",
  description: "웹툰·만화 기획 메모를 정리하고 가장 먼저 손볼 점을 알려주는 개인용 도구",
  // Private tool for two people: keep it out of search engines.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${notoSansKr.variable} ${notoSerifKr.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
