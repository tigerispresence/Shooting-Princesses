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
  title: "달빛 성 탈출",
  description: "다섯 개의 방에 숨은 수수께끼를 풀고 달빛 성을 빠져나가자!",
};

export const viewport: Viewport = {
  themeColor: "#140a20",
  // 고정 크기 게임판이라, 더블탭 확대는 방해만 된다.
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#140a20]">{children}</body>
    </html>
  );
}
