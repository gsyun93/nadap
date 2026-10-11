import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_KR } from "next/font/google";
import "./globals.css";

const plex = IBM_Plex_Sans_KR({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-plex",
  display: "swap",
});

export const metadata: Metadata = {
  title: "나답 — 나를 찾는 답",
  description: "고민 하나를 고르면 나에게 맞춘 질문이 이어져요. 성향과 사주까지 반영해 답을 찾아드려요.",
  applicationName: "나답",
  appleWebApp: { capable: true, title: "나답", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1020" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${plex.variable} antialiased`}>
      <body>
        {/* 넓은 화면에서는 최대 440px 가운데 정렬 */}
        <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col">{children}</div>
      </body>
    </html>
  );
}
