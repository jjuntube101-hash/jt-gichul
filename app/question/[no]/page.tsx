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

  const rate = q.analysis.estimated_correct_rate;
  const rateHook = rate <= 40
    ? `정답률 ${rate}% 킬러 문항`
    : rate <= 60
    ? `절반이 틀리는 문항 (정답률 ${rate}%)`
    : `정답률 ${rate}%`;

  const isAcc = q.tax_type === '회계';
  const title = `${q.대분류} ${q.중분류} — ${q.시험_구분} ${q.시행년도} | JT기출${isAcc ? ' 회계' : ''}`;
  const description = isAcc
    ? `${rateHook} — 선지별 정오판 무료 해설`
    : `${rateHook} — 선지별 정오판·근거조문·함정유형까지 무료 해설`;

  return {
    title,
    description,
    robots: {
      index: true,
      follow: true,
      noarchive: true,
      'max-snippet': 80,
    },
    openGraph: {
      title: `${q.대분류} — 이 문제 맞힐 수 있어? | JT기출`,
      description,
      type: "article",
      url: `https://gichul.jttax.co.kr/question/${q.no}`,
      siteName: "JT기출",
    },
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

  // 같은 과목 내에서 이전/다음 no 계산
  const allNos = getAllNos();
  const isAccounting = no >= 2001;
  const subjectNos = allNos.filter(n => isAccounting ? n >= 2001 : n < 2001);
  const idx = subjectNos.indexOf(no);
  const prevNo = idx > 0 ? subjectNos[idx - 1] : null;
  const nextNo = idx < subjectNos.length - 1 ? subjectNos[idx + 1] : null;

  return (
    <Suspense fallback={null}>
      <QuestionView
        question={question}
        totalQuestions={subjectNos.length}
        prevNo={prevNo}
        nextNo={nextNo}
        currentIndex={idx + 1}
      />
    </Suspense>
  );
}
