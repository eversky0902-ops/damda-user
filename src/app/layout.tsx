import type { Metadata } from "next";
import { Providers } from "@/providers";
import { FloatingChatButton } from "@/components/common/FloatingChatButton";
import "./globals.css";

export const metadata: Metadata = {
  title: "담다 - 어린이집 현장체험 예약",
  description: "국공립 어린이집을 위한 현장체험 상품 예약 플랫폼",
  keywords: ["어린이집", "현장체험", "체험학습", "예약", "담다"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="font-pretendard antialiased bg-white">
        <Providers>
          {children}
          <FloatingChatButton />
        </Providers>
      </body>
    </html>
  );
}
