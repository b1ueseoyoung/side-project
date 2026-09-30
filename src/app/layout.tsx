import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted so the CSP keeps font-src 'self' (next.config.ts). License: fonts/OFL.txt.
// ponytail: the whole variable font (2 MB) loads once and is cached; split it into
// unicode-range subsets if the first visit feels slow.
const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "45 920",
  display: "swap",
});

export const metadata: Metadata = {
  title: "기획 메모 진단",
  description: "웹툰·만화 기획 메모를 정리하고 가장 먼저 손볼 점을 알려주는 개인용 도구",
  // Private tool for two people: keep it out of search engines.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${pretendard.variable} h-full antialiased`}>
      {/* Browser extensions add attributes to <body> before React hydrates. This only
          ignores <body>'s own attributes; mismatches inside the app are still reported. */}
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
