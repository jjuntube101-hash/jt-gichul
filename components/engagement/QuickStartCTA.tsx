"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import { loadAllQuestions } from "@/lib/questions";

export default function QuickStartCTA() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);

  const handleClick = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const all = await loadAllQuestions();
      const idx = Math.floor(Math.random() * all.length);
      const q = all[idx];
      router.push(`/question/${q.no}`);
    } catch {
      router.push("/practice?filter=random");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [router]);

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary-hover py-4 text-base font-bold text-white shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-70"
    >
      <Zap className={`h-5 w-5 ${loading ? "animate-pulse" : ""}`} />
      {loading ? "문항 선택 중..." : "1문제만!"}
    </button>
  );
}
