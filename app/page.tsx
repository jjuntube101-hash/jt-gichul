import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { BookOpen, Shuffle, Zap, Clock, FileX, Search } from "lucide-react";
import * as fs from "fs";
import * as path from "path";
import type { ExamIndex } from "@/types/question";
import HomeEngagement from "@/components/engagement/HomeEngagement";
import QuickStartCTA from "@/components/engagement/QuickStartCTA";
import DailyQuestCard from "@/components/engagement/DailyQuestCard";
import DailyStudyPlan from "@/components/engagement/DailyStudyPlan";
import WeeklyReport from "@/components/engagement/WeeklyReport";
import SpacedReviewCard from "@/components/engagement/SpacedReviewCard";
import CategoryTree from "@/components/home/CategoryTree";

function getExamIndex(): ExamIndex {
  const filePath = path.join(process.cwd(), "public/data/exam_index.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

export default function Home() {
  const examIndex = getExamIndex();

  return (
    <div className="space-y-6">
      {/* Hero — compact */}
      <section className="gradient-hero relative overflow-hidden rounded-2xl p-5 text-white">
        <div className="relative z-10">
          <p className="text-[10px] font-medium text-white/70">이현준 세무사의</p>
          <h1 className="mt-0.5 text-xl font-bold tracking-tight">
            공무원 세법 기출
          </h1>
          <p className="mt-1.5 text-xs text-white/80">
            {examIndex.total_questions.toLocaleString()}문항 &middot; 선지별 정오판 &middot; 함정유형
          </p>
        </div>
        <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-4 -right-2 h-20 w-20 rounded-full bg-white/5" />
      </section>

      {/* 1문제만! CTA */}
      <QuickStartCTA />

      {/* Streak + 미완성 업무 카드 (logged in users) */}
      <HomeEngagement />

      {/* 오늘의 학습 플랜 */}
      <DailyStudyPlan />

      {/* 데일리 퀘스트 (logged in users) */}
      <DailyQuestCard />

      {/* 주간 리포트 (일요일 저녁~월요일) */}
      <WeeklyReport />

      {/* 간격 복습 알림 */}
      <SpacedReviewCard />

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
      </section>

      {/* 과목별 문제 — 접힌 카테고리 트리 */}
      <CategoryTree categories={examIndex.categories} />
    </div>
  );
}
