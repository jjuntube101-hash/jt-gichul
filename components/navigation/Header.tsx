"use client";

import Link from "next/link";
import Image from "next/image";
import { Moon, Sun, Search } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAppStore } from "@/stores/appStore";
import HeaderAuth from "./HeaderAuth";

export default function Header() {
  const { resolved, toggle } = useTheme();
  const isFocusMode = useAppStore((s) => s.isFocusMode);

  if (isFocusMode) return null;

  return (
    <header className="glass sticky top-0 z-50 border-b border-border">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <Image
            src="/logo-jt.png"
            alt="JT"
            width={28}
            height={28}
            className={`${resolved === "dark" ? "invert" : ""}`}
          />
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
              기출
            </span>
            <span className="text-[10px] font-medium text-muted-foreground">세법</span>
          </div>
        </Link>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <Link
            href="/search"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="검색"
          >
            <Search className="h-4 w-4" />
          </Link>
          <button
            onClick={toggle}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label={resolved === "dark" ? "라이트 모드" : "다크 모드"}
          >
            {resolved === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
          <HeaderAuth />
        </div>
      </div>
    </header>
  );
}
