import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/navigation/BottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JT기출 — 공무원 세법 기출 학습",
  description:
    "이현준 세무사의 1,245문항 전수분석. 선지별 정오판·근거조문·함정유형·출제의도까지.",
  manifest: "/manifest.json",
  openGraph: {
    title: "JT기출 — 공무원 세법 기출 학습",
    description:
      "세법 기출, 선지 하나까지 왜 틀렸는지 알려주는 앱",
    type: "website",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "JT기출",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm">
          <div className="mx-auto flex h-14 max-w-2xl items-center px-4">
            <a href="/" className="text-lg font-bold tracking-tight">
              JT기출
            </a>
            <span className="ml-2 text-xs text-slate-500">세법</span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 pb-20">
          {children}
        </main>
        <footer className="border-t bg-white py-4 pb-16 text-center text-xs text-slate-400">
          이현준 세무사 &middot; 제이티 세무회계
        </footer>
        <BottomNav />
      </body>
    </html>
  );
}
