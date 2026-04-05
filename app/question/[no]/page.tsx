import * as fs from "fs";
import * as path from "path";
import { Suspense } from "react";
import type { Question, ChunkMeta } from "@/types/question";
import QuestionView from "./QuestionView";

/** 전체 문항 no 배열 (정렬됨) */
function getAllNos(): number[] {
  const metaPath = path.join(process.cwd(), "public/data/questions/meta.json");
  const meta: ChunkMeta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));

  const nos: number[] = [];
  for (const chunk of meta.chunks) {
    const chunkPath = path.join(process.cwd(), `public/data/questions/${chunk.file}`);
    const questions: Question[] = JSON.parse(fs.readFileSync(chunkPath, "utf-8"));
    for (const q of questions) {
      nos.push(q.no);
    }
  }
  return nos.sort((a, b) => a - b);
}

/** 서버에서 문항 데이터 로드 (SSR) */
function getQuestion(no: number): Question | null {
  const metaPath = path.join(process.cwd(), "public/data/questions/meta.json");
  const meta: ChunkMeta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));

  const chunk = meta.chunks.find(c => no >= c.start_no && no <= c.end_no);
  if (!chunk) return null;

  const chunkPath = path.join(process.cwd(), `public/data/questions/${chunk.file}`);
  const questions: Question[] = JSON.parse(fs.readFileSync(chunkPath, "utf-8"));
  return questions.find(q => q.no === no) ?? null;
}

export async function generateStaticParams() {
  const nos = getAllNos();
  return nos.map(no => ({ no: String(no) }));
}

export async function generateMetadata({ params }: { params: Promise<{ no: string }> }) {
  const { no: noStr } = await params;
  const no = parseInt(noStr, 10);
  const q = getQuestion(no);
  if (!q) return { title: "문항을 찾을 수 없습니다" };

  return {
    title: `#${q.no} ${q.대분류} — JT기출`,
    description: q.문제_내용.slice(0, 100),
  };
}

export default async function QuestionPage({ params }: { params: Promise<{ no: string }> }) {
  const { no: noStr } = await params;
  const no = parseInt(noStr, 10);
  const question = getQuestion(no);

  if (!question) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg font-bold text-slate-700">문항을 찾을 수 없습니다</p>
        <p className="mt-2 text-sm text-slate-500">문항 번호: {no}</p>
      </div>
    );
  }

  // 갭을 건너뛰는 이전/다음 no 계산
  const allNos = getAllNos();
  const idx = allNos.indexOf(no);
  const prevNo = idx > 0 ? allNos[idx - 1] : null;
  const nextNo = idx < allNos.length - 1 ? allNos[idx + 1] : null;

  return (
    <Suspense fallback={null}>
      <QuestionView
        question={question}
        totalQuestions={allNos.length}
        prevNo={prevNo}
        nextNo={nextNo}
        currentIndex={idx + 1}
      />
    </Suspense>
  );
}
