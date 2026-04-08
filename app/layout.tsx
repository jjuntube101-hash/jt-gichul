import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthListener from "@/components/auth/AuthListener";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JT기출 — 공무원 세법·회계 기출 학습",
  description:
    "이현준 세무사의 세법 1,245문항 + 회계 820문항 전수분석. 선지별 정오판·근거조문·함정유형·출제의도까지.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "JT기출 — 공무원 세법·회계 기출 학습",
    description:
      "세법·회계 기출, 선지 하나까지 왜 틀렸는지 알려주는 앱. 2,065문항 전수분석.",
    type: "website",
    url: "https://gichul.jttax.co.kr",
    siteName: "JT기출",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary",
    title: "JT기출 — 공무원 세법·회계 기출 학습",
    description: "이현준 세무사의 세법 1,245 + 회계 820문항 전수분석. 선지별 정오판·근거조문·함정유형.",
  },
  alternates: {
    canonical: "https://gichul.jttax.co.kr",
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
  maximumScale: 5,
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("jt-gichul-theme");if(t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme:dark)").matches))document.documentElement.classList.add("dark")}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground antialiased">
        <AuthListener />
        {children}
      </body>
    </html>
  );
}
