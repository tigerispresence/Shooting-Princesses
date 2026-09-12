import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "학교 좀비, 살아남자!",
  description:
    "보라 브로콜리 푸딩을 먹고 졸음 좀비가 된 학교에서 재료를 모아 해독제를 만들자!",
};

export const viewport: Viewport = {
  themeColor: "#151129",
  // 고정 크기 게임판이라 더블탭 확대는 방해만 된다
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[#151129]">{children}</body>
    </html>
  );
}
