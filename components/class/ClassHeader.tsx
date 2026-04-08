"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

const tabs = [
  { href: "/class", label: "공지" },
  { href: "/class/qna", label: "Q&A" },
] as const;

export default function ClassHeader() {
  const pathname = usePathname();

  const activeTab = pathname.startsWith("/class/qna") ? "/class/qna" : "/class";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      {/* 상단 바 */}
      <div className="flex items-center justify-between px-4 py-3">
        <Link
          href="/mypage"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          기출앱
        </Link>
        <h1 className="text-base font-bold text-foreground">JT 강의실</h1>
        <div className="w-14" /> {/* 균형용 spacer */}
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex border-t border-border">
        {tabs.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`flex-1 py-2.5 text-center text-sm font-medium transition-colors ${
              activeTab === href
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
    </header>
  );
}
