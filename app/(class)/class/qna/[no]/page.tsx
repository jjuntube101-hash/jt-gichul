"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import CommentThread from "@/components/class/CommentThread";

export default function QnAPage() {
  const params = useParams();
  const no = parseInt(params.no as string);

  if (!no || no < 1) {
    return (
      <div className="text-center py-20 text-sm text-muted-foreground">
        잘못된 문제 번호입니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 문제 정보 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">
          문제 {no}번 Q&A
        </h2>
        <Link
          href={`/question/${no}`}
          className="flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          문제 보기
        </Link>
      </div>

      {/* 댓글 스레드 */}
      <CommentThread questionNo={no} />
    </div>
  );
}
