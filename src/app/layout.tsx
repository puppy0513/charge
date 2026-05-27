import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "수수료 정산 대시보드",
  description: "반기 성과보수 실시간 시뮬레이션"
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
