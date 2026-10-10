import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "타닥타닥 타자교실",
  description: "자리연습, 낱말연습, 짧은 글, 그리고 사탕비 마을! 두벌식 한글 타자 연습",
};

export const viewport: Viewport = {
  themeColor: "#F6E9F5",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="h-full">{children}</body>
    </html>
  );
}
