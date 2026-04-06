"use client";

import Link from "next/link";
import { LogIn } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function HeaderAuth() {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (user) {
    return (
      <Link
        href="/mypage"
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
        title="마이페이지"
      >
        {user.user_metadata?.name?.[0] ??
          user.email?.[0]?.toUpperCase() ??
          "U"}
      </Link>
    );
  }

  return (
    <Link
      href="/login"
      className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-white hover:bg-primary-hover transition-colors"
    >
      <LogIn className="h-3.5 w-3.5" />
      로그인
    </Link>
  );
}
