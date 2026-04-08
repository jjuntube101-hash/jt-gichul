"use client";

import { Search, MessageCircle } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function QnAIndexPage() {
  const [questionNo, setQuestionNo] = useState("");
  const router = useRouter();

  function handleSearch() {
    const no = parseInt(questionNo);
    if (no > 0) {
      router.push(`/class/qna/${no}`);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground mb-1">문제별 Q&A</h2>
        <p className="text-sm text-muted-foreground">
          궁금한 문제 번호를 입력하면 해당 문제의 질문·답변을 볼 수 있습니다.
        </p>
      </div>

      {/* 문제 번호 검색 */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="number"
            inputMode="numeric"
            value={questionNo}
            onChange={(e) => setQuestionNo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            placeholder="문제 번호 입력 (예: 42)"
            className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={!questionNo || parseInt(questionNo) < 1}
          className="rounded-xl bg-primary px-5 py-3 text-sm font-medium text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          이동
        </button>
      </div>

      {/* 안내 */}
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <MessageCircle className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">
          기출 문제를 풀다 궁금한 점이 있으면
          <br />
          해당 문제 페이지 하단의{" "}
          <span className="font-medium text-primary">&quot;수강생 Q&A&quot;</span> 링크를 눌러주세요.
        </p>
      </div>
    </div>
  );
}
