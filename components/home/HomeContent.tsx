"use client";

import { useAppStore } from "@/stores/appStore";
import type { ExamIndex } from "@/types/question";
import SubjectTabs from "./SubjectTabs";
import CategoryTree from "./CategoryTree";

interface Props {
  taxIndex: ExamIndex;
  accountingIndex: ExamIndex;
}

export default function HomeContent({ taxIndex, accountingIndex }: Props) {
  const subject = useAppStore((s) => s.subject);
  const examIndex = subject === "accounting" ? accountingIndex : taxIndex;

  return (
    <>
      {/* Hero -- compact */}
      <section className="gradient-hero relative overflow-hidden rounded-2xl p-5 text-white">
        <div className="relative z-10">
          <p className="text-[10px] font-medium text-white/70">이현준 세무사의</p>
          <h1 className="mt-0.5 text-xl font-bold tracking-tight">
            {subject === "accounting" ? "공무원 회계 기출" : "공무원 세법 기출"}
          </h1>
          <p className="mt-1.5 text-xs text-white/80">
            {examIndex.total_questions.toLocaleString()}문항 &middot;{" "}
            {subject === "accounting"
              ? "선지별 정오판 \u00b7 분류별 학습"
              : "선지별 정오판 \u00b7 함정유형"}
          </p>
        </div>
        <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-4 -right-2 h-20 w-20 rounded-full bg-white/5" />
      </section>

      {/* 과목 선택 탭 */}
      <SubjectTabs />

      {/* 과목별 문제 -- 접힌 카테고리 트리 */}
      <CategoryTree categories={examIndex.categories} subject={subject} />
    </>
  );
}
