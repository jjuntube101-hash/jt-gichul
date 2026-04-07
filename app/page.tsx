import Link from "next/link";
import { BookOpen, Shuffle, Zap, Clock, FileX, Search, Target, Sparkles } from "lucide-react";
import * as fs from "fs";
import * as path from "path";
import type { ExamIndex } from "@/types/question";
import HomeContent from "@/components/home/HomeContent";
import HomeCards from "@/components/home/HomeCards";

function getExamIndex(): ExamIndex {
  const filePath = path.join(process.cwd(), "public/data/exam_index.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

function getExamIndexAccounting(): ExamIndex {
  const filePath = path.join(process.cwd(), "public/data/exam_index_accounting.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

export default function Home() {
  const taxIndex = getExamIndex();
  const accountingIndex = getExamIndexAccounting();

  return (
    <div className="space-y-6">
      {/* Hero + 과목 탭 + 카테고리 (클라이언트 컴포넌트) */}
      <HomeContent taxIndex={taxIndex} accountingIndex={accountingIndex} />

      {/* 단계별 홈 카드 (유저 단계에 따라 축소 표시) */}
      <HomeCards />

      {/* 학습 모드 — 4칸 핵심 */}
      <section className="grid grid-cols-4 gap-2">
        <Link href="/ox" className="group">
          <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-3 transition-all hover:border-primary/30 hover:shadow-md">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-success-light text-success">
              <Zap className="h-4 w-4" />
            </div>
            <div className="text-center">
              <div className="text-xs font-bold text-card-foreground">OX 퀴즈</div>
            </div>
          </div>
        </Link>
        <Link href="/timer" className="group">
          <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-3 transition-all hover:border-primary/30 hover:shadow-md">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-light text-primary">
              <Clock className="h-4 w-4" />
            </div>
            <div className="text-center">
              <div className="text-xs font-bold text-card-foreground">타이머</div>
            </div>
          </div>
        </Link>
        <Link href="/review" className="group">
          <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-3 transition-all hover:border-primary/30 hover:shadow-md">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-danger-light text-danger">
              <FileX className="h-4 w-4" />
            </div>
            <div className="text-center">
              <div className="text-xs font-bold text-card-foreground">오답노트</div>
            </div>
          </div>
        </Link>
        <Link href="/search" className="group">
          <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-3 transition-all hover:border-primary/30 hover:shadow-md">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-warning-light text-warning">
              <Search className="h-4 w-4" />
            </div>
            <div className="text-center">
              <div className="text-xs font-bold text-card-foreground">검색</div>
            </div>
          </div>
        </Link>
      </section>

      {/* 빠른 연습 */}
      <section className="flex gap-2">
        <Link href="/quick" className="flex-1">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 transition-all hover:border-primary/30">
            <Zap className="h-3.5 w-3.5 text-success" />
            <span className="text-xs font-medium text-card-foreground">1분 퀴즈</span>
          </div>
        </Link>
        <Link href="/practice?filter=recent" className="flex-1">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 transition-all hover:border-primary/30">
            <BookOpen className="h-3.5 w-3.5 text-info" />
            <span className="text-xs font-medium text-card-foreground">최근 기출</span>
          </div>
        </Link>
        <Link href="/practice?filter=random" className="flex-1">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 transition-all hover:border-primary/30">
            <Shuffle className="h-3.5 w-3.5 text-warning" />
            <span className="text-xs font-medium text-card-foreground">랜덤 10문</span>
          </div>
        </Link>
        <Link href="/mock-exam" className="flex-1">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 transition-all hover:border-primary/30">
            <Target className="h-3.5 w-3.5 text-danger" />
            <span className="text-xs font-medium text-card-foreground">모의고사</span>
          </div>
        </Link>
      </section>

      {/* AI 학습 도구 */}
      <section>
        <Link href="/ai" className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary-light p-3.5 transition-all hover:border-primary/40 hover:shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-card-foreground">AI 학습 도구</p>
            <p className="text-[10px] text-muted-foreground">출제 패턴 · 함정 훈련 · 유사문항 · 암기카드</p>
          </div>
          <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">NEW</span>
        </Link>
      </section>
    </div>
  );
}
