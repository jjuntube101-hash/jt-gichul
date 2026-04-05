import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import * as fs from "fs";
import * as path from "path";
import type { ExamIndex } from "@/types/question";

/** 서버에서 exam_index.json 직접 읽기 (빌드 시 정적 생성) */
function getExamIndex(): ExamIndex {
  const filePath = path.join(process.cwd(), "public/data/exam_index.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

export default function Home() {
  const examIndex = getExamIndex();

  return (
    <div className="space-y-6">
      {/* 히어로 */}
      <section className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          공무원 세법 기출
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          이현준 세무사의 {examIndex.total_questions.toLocaleString()}문항 전수분석
        </p>
        <p className="mt-2 text-xs text-slate-400">
          선지별 정오판 &middot; 근거조문 &middot; 함정유형 &middot; 출제의도
        </p>
      </section>

      {/* 빠른 시작 */}
      <section className="grid grid-cols-3 gap-2">
        <Link href="/ox">
          <Card className="cursor-pointer transition-colors hover:bg-slate-100">
            <CardContent className="p-3 text-center">
              <div className="text-lg font-bold">OX</div>
              <div className="text-xs text-slate-500">오늘의 드릴</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/practice?filter=recent">
          <Card className="cursor-pointer transition-colors hover:bg-slate-100">
            <CardContent className="p-3 text-center">
              <div className="text-lg font-bold">최근</div>
              <div className="text-xs text-slate-500">기출</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/practice?filter=random">
          <Card className="cursor-pointer transition-colors hover:bg-slate-100">
            <CardContent className="p-3 text-center">
              <div className="text-lg font-bold">랜덤</div>
              <div className="text-xs text-slate-500">10문</div>
            </CardContent>
          </Card>
        </Link>
      </section>

      {/* 단원별 학습 — exam_index.json 동적 렌더링 */}
      {Object.entries(examIndex.categories).map(([taxType, laws]) => (
        <section key={taxType} className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">
            {taxType === "국세" ? "국세" : "지방세"}
          </h2>

          {Object.entries(laws).map(([lawName, topics]) => {
            const topicEntries = Object.entries(topics);
            const totalCount = topicEntries.reduce((sum, [, t]) => sum + t.total, 0);
            // 법 단위 최고 등급 사용
            const maxGrade = topicEntries.reduce(
              (best, [, t]) => (t.grade.length > best.length ? t.grade : best),
              ""
            );

            return (
              <div key={lawName}>
                {/* 법 헤더 */}
                <Link href={`/practice?law=${encodeURIComponent(lawName)}`}>
                  <Card className="cursor-pointer transition-colors hover:bg-slate-100">
                    <CardContent className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{lawName}</span>
                        <Badge variant="secondary" className="text-xs">
                          {maxGrade}
                        </Badge>
                      </div>
                      <span className="text-sm text-slate-500">{totalCount}문항</span>
                    </CardContent>
                  </Card>
                </Link>

                {/* 소분류 태그 */}
                <div className="mt-1.5 flex flex-wrap gap-1 pl-2">
                  {topicEntries.map(([topicName, t]) => (
                    <Link
                      key={topicName}
                      href={`/practice?law=${encodeURIComponent(lawName)}&topic=${encodeURIComponent(topicName)}`}
                    >
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 transition-colors hover:bg-slate-200">
                        {topicName}
                        <span className="text-slate-400">{t.total}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
