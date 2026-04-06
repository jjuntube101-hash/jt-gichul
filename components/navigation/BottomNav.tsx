"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Home, BookOpen, FileX, CircleDot, Clock, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAppStore } from "@/stores/appStore";

const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "홈", icon: Home },
  { href: "/practice", label: "과목별", icon: BookOpen },
  { href: "/review", label: "오답", icon: FileX },
  { href: "/ox", label: "OX", icon: CircleDot },
  { href: "/timer", label: "타이머", icon: Clock },
  { href: "/mypage", label: "MY", icon: User },
];

function BottomNavInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentFilter = searchParams.get("filter");
  const isFocusMode = useAppStore((s) => s.isFocusMode);

  if (isFocusMode) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-[env(safe-area-inset-bottom,0px)]">
      <div className="glass mx-auto mb-3 flex h-14 max-w-md items-center justify-around rounded-2xl border border-border shadow-float">
        {navItems.map((item) => {
          let isActive: boolean;
          if (item.href === "/") {
            isActive = pathname === "/";
          } else if (item.href === "/practice") {
            isActive = pathname.startsWith("/practice");
          } else {
            isActive = pathname.startsWith(item.href);
          }

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 text-[10px] transition-colors ${
                isActive
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon
                className={`h-5 w-5 transition-transform ${
                  isActive ? "scale-110" : ""
                }`}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              <span>{item.label}</span>
              {isActive && (
                <span className="absolute -top-0.5 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default function BottomNav() {
  return (
    <Suspense>
      <BottomNavInner />
    </Suspense>
  );
}
